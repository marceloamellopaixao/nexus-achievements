'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// 1. Tipagens da API da Steam para deixar o ESLint feliz
interface SteamGame {
  appid: number;
  name: string;
  playtime_forever: number;
  rtime_last_played: number;
  img_icon_url?: string;
}

interface SteamAchievement {
  apiname: string;
  achieved: number;
  unlocktime: number;
}

// Função de salvar a Steam ID
export async function saveSteamId(steamId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Não autorizado.' }

  const { error } = await supabase
    .from('users')
    .update({ steam_id: steamId })
    .eq('id', user.id)

  if (error) return { error: 'Erro ao salvar Steam ID. Verifique se já está em uso.' }
  
  revalidatePath('/integrations')
  return { success: 'Steam ID vinculada com sucesso!' }
}

// Função do Motor de Sincronização
export async function syncSteamAchievements() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'Não autorizado.' };

  const { data: userData } = await supabase
    .from('users')
    .select('steam_id, nexus_coins, global_level, total_games, total_platinums, last_steam_sync')
    .eq('id', user.id)
    .single();

  if (!userData?.steam_id) return { error: 'Nenhuma Steam ID vinculada.' };

  const STEAM_KEY = process.env.STEAM_API_KEY;
  
  try {
    const gamesRes = await fetch(`http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${STEAM_KEY}&steamid=${userData.steam_id}&format=json&include_appinfo=1`);
    const gamesData = await gamesRes.json();
    
    if (!gamesData.response || !gamesData.response.games) {
      return { error: 'Perfil da Steam privado ou sem jogos.' };
    }

    const allGames: SteamGame[] = gamesData.response.games;
    
    // Filtra apenas jogos jogados e ordena pelos mais recentes.
    // REMOVIDO O LIMITE! Agora processa a biblioteca inteira.
    const gamesToProcess = allGames
      .filter((g: SteamGame) => g.playtime_forever > 0)
      .sort((a: SteamGame, b: SteamGame) => b.rtime_last_played - a.rtime_last_played);
    
    let newCoinsEarned = 0;
    let newPlatinumsEarned = 0;
    let gamesProcessedCount = 0;

    // ALERTA DE ARQUITETURA: Sem o limite, se o usuário tiver 1000 jogos, 
    // isso vai fazer 1000 requisições seguidas. No modo local (npm run dev) funciona bem, 
    // mas em servidores gratuitos na nuvem (como Vercel) pode dar "Timeout" (limite de 15 segundos).
    for (const game of gamesToProcess) {
      const appId = game.appid.toString();
      const steamGameId = `steam-${appId}`;

      const achievementsRes = await fetch(`http://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/?appid=${appId}&key=${STEAM_KEY}&steamid=${userData.steam_id}`);
      if (!achievementsRes.ok) continue; 
      
      const achievementsData = await achievementsRes.json();
      if (!achievementsData.playerstats || !achievementsData.playerstats.success) continue;

      const achievements: SteamAchievement[] = achievementsData.playerstats.achievements || [];
      if (achievements.length === 0) continue;

      const unlockedCount = achievements.filter((a: SteamAchievement) => a.achieved === 1).length;
      const totalCount = achievements.length;
      const isPlat = unlockedCount === totalCount && totalCount > 0;

      const { error: gameError } = await supabase.from('games').upsert({
        id: steamGameId,
        title: game.name,
        cover_url: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/library_600x900.jpg`,
        banner_url: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`,
        total_achievements: totalCount
      }, { onConflict: 'id' });

      if (gameError) continue;

      const { data: existingRecord } = await supabase
        .from('user_games')
        .select('id, unlocked_achievements, is_platinum')
        .eq('user_id', user.id)
        .eq('game_id', steamGameId)
        .maybeSingle();

      const previousUnlocked = existingRecord?.unlocked_achievements || 0;
      const wasPlat = existingRecord?.is_platinum || false;

      if (unlockedCount > previousUnlocked) {
        let successSaving = true;

        if (existingRecord) {
          const { error: updateErr } = await supabase.from('user_games').update({
            playtime_minutes: game.playtime_forever,
            unlocked_achievements: unlockedCount,
            total_achievements: totalCount,
            is_platinum: isPlat,
            last_synced_at: new Date().toISOString()
          }).eq('id', existingRecord.id);
          if (updateErr) successSaving = false;
        } else {
          const { error: insertErr } = await supabase.from('user_games').insert({
            user_id: user.id,
            game_id: steamGameId,
            playtime_minutes: game.playtime_forever,
            unlocked_achievements: unlockedCount,
            total_achievements: totalCount,
            is_platinum: isPlat
          });
          if (insertErr) successSaving = false;
        }

        if (successSaving) {
          const newAchievements = unlockedCount - previousUnlocked;
          newCoinsEarned += (newAchievements * 15);
          
          if (isPlat && !wasPlat) {
            newCoinsEarned += 500; 
            newPlatinumsEarned += 1;

            await supabase.from('global_activity').insert({
              user_id: user.id,
              game_name: game.name,
              achievement_name: `🏆 PLATINOU O JOGO!`,
              points_earned: 500,
              platform: 'Steam'
            });
          }
        }
      }
      gamesProcessedCount++;
    }

    // Atualiza os dados finais do usuário e REGISTRA O HORÁRIO DA SYNC
    const finalCoins = (userData.nexus_coins || 0) + newCoinsEarned;
    const finalPlatinums = (userData.total_platinums || 0) + newPlatinumsEarned;

    await supabase
      .from('users')
      .update({
        nexus_coins: finalCoins,
        total_games: allGames.length,
        total_platinums: finalPlatinums,
        global_level: Math.floor(finalCoins / 1000) + 1,
        last_steam_sync: new Date().toISOString() // <-- A MÁGICA DA AUTOMAÇÃO AQUI
      })
      .eq('id', user.id);

    revalidatePath('/integrations');
    revalidatePath('/dashboard');
    revalidatePath('/profile');

    if (newCoinsEarned === 0) {
      return { success: `Verificamos todos os seus ${gamesProcessedCount} jogos. Nenhum troféu novo encontrado.` };
    }

    return { success: `Sincronização épica! Você ganhou +${newCoinsEarned} Nexus Coins e ${newPlatinumsEarned} Platinas novas!` };

  } catch (err) {
    console.error("Erro na sync da Steam:", err);
    return { error: 'Falha interna na sincronização.' };
  }
}