'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

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

export async function syncSteamAchievements() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Não autorizado.' }

  // 1. Busca a Steam ID e os status atuais do usuário
  const { data: userData } = await supabase
    .from('users')
    .select('steam_id, nexus_coins, global_level, total_games, total_platinums')
    .eq('id', user.id)
    .single()

  if (!userData?.steam_id) return { error: 'Nenhuma Steam ID vinculada.' }

  const STEAM_KEY = process.env.STEAM_API_KEY
  
  try {
    // 2. Busca os jogos do usuário na Steam
    const gamesRes = await fetch(`http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${STEAM_KEY}&steamid=${userData.steam_id}&format=json&include_appinfo=1`)
    const gamesData = await gamesRes.json()
    
    if (!gamesData.response || !gamesData.response.games) {
      return { error: 'Perfil da Steam privado ou sem jogos.' }
    }

    const games = gamesData.response.games;
    const currentGamesCount = userData.total_games || 0;
    const newGamesCount = games.length;

    // 3. Trava de segurança: Se não há jogos novos, não faz nada
    if (newGamesCount === currentGamesCount) {
      return { success: 'Tudo atualizado! Nenhuma nova conquista encontrada.' };
    }

    // 4. Lógica de Recompensas
    let coinsToAdd = 0;
    let activityTitle = '';

    if (currentGamesCount === 0) {
      // Primeira vez sincronizando
      coinsToAdd = 500;
      activityTitle = 'Sincronização Inicial Concluída';
    } else if (newGamesCount > currentGamesCount) {
      // Comprou/ganhou jogos novos desde a última sync
      const diff = newGamesCount - currentGamesCount;
      coinsToAdd = diff * 10; // 10 coins de bônus por cada jogo novo adicionado
      activityTitle = `Sincronizou ${diff} novo(s) jogo(s)`;
    }

    const newCoins = (userData.nexus_coins || 0) + coinsToAdd;

    // 5. Atualiza o banco com os novos valores
    await supabase
      .from('users')
      .update({
        nexus_coins: newCoins,
        total_games: newGamesCount,
        global_level: Math.floor(newCoins / 1000) + 1 // Regra de nível: 1 nível a cada 1000 moedas
      })
      .eq('id', user.id)

    // 6. Só insere no Feed Global se o usuário realmente ganhou pontos
    if (coinsToAdd > 0) {
      await supabase
        .from('global_activity')
        .insert({
          user_id: user.id,
          game_name: 'Conta Steam',
          achievement_name: activityTitle,
          points_earned: coinsToAdd,
          platform: 'Steam'
        })
    }

    revalidatePath('/integrations')
    revalidatePath('/dashboard')
    revalidatePath('/profile')

    return { success: `Sincronização concluída! +${coinsToAdd} Nexus Coins.` }

  } catch (err) {
    console.error(err)
    return { error: 'Falha ao conectar com a API da Steam.' }
  }
}