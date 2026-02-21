'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// Tipagens da API da Steam
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

// Chave do desenvolvedor (Sua chave)
const SGDB_KEY = process.env.STEAMGRIDDB_API_KEY;

// Função auxiliar para buscar imagens no SteamGridDB se a Steam falhar
async function getBackupImage(appId: string, type: 'grids' | 'heroes' | 'logos') {
  if (!SGDB_KEY) return null;
  try {
    const response = await fetch(`https://www.steamgriddb.com/api/v2/${type}/steam/${appId}`, {
      headers: { 'Authorization': `Bearer ${SGDB_KEY}` }
    });

    const resData = await response.json();
    if (resData.success && resData.data.length > 0) {
      return resData.data[0].url;
    }
    return null;
  } catch (error) {
    console.error(`Erro SteamGridDB (${type}):`, error);
    return null;
  }
}

// 1. Função de salvar a Steam ID
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

// 2. BUSCA A LISTA DE JOGOS
export async function fetchSteamGamesList() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const { data: userData } = await supabase.from('users').select('steam_id').eq('id', user.id).single()
  if (!userData?.steam_id) return { error: 'Nenhuma Steam ID vinculada.' }

  const STEAM_KEY = process.env.STEAM_API_KEY
  try {
    const res = await fetch(`http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${STEAM_KEY}&steamid=${userData.steam_id}&format=json&include_appinfo=1`)
    const data = await res.json()

    if (!data?.response?.games) return { error: 'Perfil privado ou sem jogos.' }

    const gamesToProcess = data.response.games
      .filter((g: SteamGame) => g.playtime_forever > 0)
      .sort((a: SteamGame, b: SteamGame) => b.rtime_last_played - a.rtime_last_played)

    return { games: gamesToProcess, steamId: userData.steam_id }
  } catch {
    return { error: 'Falha ao buscar lista da Steam.' }
  }
}

// 3. PROCESSA UM ÚNICO JOGO E CALCULA RARIDADE (VERSÃO MULTI-USUÁRIO)
export async function processSingleGame(game: SteamGame, steamId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { coins: 0, plats: 0 }

  const STEAM_KEY = process.env.STEAM_API_KEY
  const appId = game?.appid?.toString()
  if (!appId) return { coins: 0, plats: 0 }

  const steamGameId = `steam-${appId}`

  try {
    const res = await fetch(`http://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/?appid=${appId}&key=${STEAM_KEY}&steamid=${steamId}`)
    if (!res.ok) return { coins: 0, plats: 0 }

    const data = await res.json()
    if (!data?.playerstats?.success) return { coins: 0, plats: 0 }

    const achievements: SteamAchievement[] = data.playerstats.achievements || []
    if (achievements.length === 0) return { coins: 0, plats: 0 }

    const unlockedAchievements = achievements.filter(a => a.achieved === 1).sort((a, b) => b.unlocktime - a.unlocktime)
    const unlockedCount = unlockedAchievements.length
    const totalCount = achievements.length
    const isPlat = unlockedCount === totalCount && totalCount > 0

    // Upsert do jogo (Metadados Globais)
    let coverUrl = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/library_600x900.jpg`;
    let bannerUrl = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`;

    // Verifica se a imagem da Steam existe (rápido)
    const checkSteam = await fetch(coverUrl, { method: 'HEAD' });
    if (!checkSteam.ok) {
      // Se falhar, tenta SteamGridDB
      const backupCover = await getBackupImage(appId, 'grids');
      const backupBanner = await getBackupImage(appId, 'heroes');
      if (backupCover) coverUrl = backupCover;
      if (backupBanner) bannerUrl = backupBanner;
    }

    // Sincroniza o jogo na tabela global
    await supabase.from('games').upsert({
      id: steamGameId,
      title: game.name,
      cover_url: coverUrl,
      banner_url: bannerUrl,
      total_achievements: totalCount
    }, { onConflict: 'id' })

    // Busca progresso individual do usuário logado
    const { data: existingRecord } = await supabase
      .from('user_games')
      .select('id, unlocked_achievements, is_platinum')
      .eq('user_id', user.id)
      .eq('game_id', steamGameId)
      .maybeSingle()

    const previousUnlocked = existingRecord?.unlocked_achievements || 0
    const wasPlat = existingRecord?.is_platinum || false

    // Atualiza o registro individual do usuário
    if (existingRecord) {
      await supabase.from('user_games').update({
        playtime_minutes: game.playtime_forever,
        unlocked_achievements: unlockedCount,
        total_achievements: totalCount,
        is_platinum: isPlat,
        last_synced_at: new Date().toISOString()
      }).eq('id', existingRecord.id)
    } else {
      await supabase.from('user_games').insert({
        user_id: user.id,
        game_id: steamGameId,
        playtime_minutes: game.playtime_forever,
        unlocked_achievements: unlockedCount,
        total_achievements: totalCount,
        is_platinum: isPlat
      })
    }

    let newCoins = 0
    let newPlats = 0

    // Se houve progresso, processamos o Feed e as Moedas
    if (unlockedCount > previousUnlocked) {
      const newAchievementsCount = unlockedCount - previousUnlocked
      const allNewAchievements = unlockedAchievements.slice(0, newAchievementsCount)

      // Busca dados extras (Nomes e Porcentagens)
      const schemaMap = new Map<string, { displayName: string, icon: string }>()
      const schemaRes = await fetch(`http://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?key=${STEAM_KEY}&appid=${appId}`)
      if (schemaRes.ok) {
        const schemaData = await schemaRes.json()
        const schemaAchs = schemaData?.game?.availableGameStats?.achievements || []
        schemaAchs.forEach((a: { name: string; displayName: string; icon: string }) => schemaMap.set(a.name, { displayName: a.displayName, icon: a.icon }))
      }

      const percentagesMap = new Map<string, number>()
      const percentRes = await fetch(`http://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v0002/?gameid=${appId}`)
      if (percentRes.ok) {
        const percentData = await percentRes.json()
        const percentList = percentData?.achievementpercentages?.achievements || []
        percentList.forEach((p: { name: string; percent: number }) => percentagesMap.set(p.name, p.percent))
      }

      const activitiesToInsert = []
      const achievementsForFeed = allNewAchievements.slice(0, 50)

      for (const ach of achievementsForFeed) {
        const unlockDate = ach?.unlocktime ? new Date(ach.unlocktime * 1000).toISOString() : new Date().toISOString()
        const schemaData = schemaMap.get(ach.apiname)
        const displayName = schemaData?.displayName || ach.apiname
        const iconUrl = schemaData?.icon || null

        const percent = percentagesMap.get(ach.apiname) || 100
        let rarity = 'bronze'
        let pts = 5
        if (percent <= 10) { rarity = 'gold'; pts = 25; }
        else if (percent <= 50) { rarity = 'silver'; pts = 10; }

        newCoins += pts

        activitiesToInsert.push({
          user_id: user.id,
          game_id: steamGameId,
          game_name: game.name,
          achievement_name: displayName,
          achievement_icon: iconUrl,
          rarity: rarity,
          points_earned: pts,
          platform: 'Steam',
          created_at: unlockDate
        })
      }

      // Registro da Platina Individual
      if (isPlat && !wasPlat) {
        newPlats += 1
        const platCoins = totalCount >= 10 ? 200 : 20
        newCoins += platCoins

        const lastUnlockTime = unlockedAchievements[0]?.unlocktime;
        const platDate = lastUnlockTime ? new Date(lastUnlockTime * 1000).toISOString() : new Date().toISOString();

        activitiesToInsert.push({
          user_id: user.id,
          game_id: steamGameId,
          game_name: game.name,
          achievement_name: `🏆 PLATINOU O JOGO!`,
          achievement_icon: 'platinum_ps5',
          rarity: 'platinum',
          points_earned: platCoins,
          platform: 'Steam',
          created_at: platDate
        })
      }

      if (activitiesToInsert.length > 0) {
        await supabase.from('global_activity').upsert(activitiesToInsert, {
          onConflict: 'user_id, game_id, achievement_name'
        })
      }
    }
    return { coins: newCoins, plats: newPlats }
  } catch {
    return { coins: 0, plats: 0 }
  }
}

// 4. ATUALIZA O SALDO FINAL DO USUÁRIO
export async function finalizeSync(totalCoinsEarned: number, totalPlatsEarned: number, totalGamesCount: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: userData } = await supabase.from('users').select('nexus_coins, total_platinums').eq('id', user.id).maybeSingle()

  const finalCoins = (userData?.nexus_coins ?? 0) + totalCoinsEarned
  const finalPlats = (userData?.total_platinums ?? 0) + totalPlatsEarned

  await supabase.from('users').update({
    nexus_coins: finalCoins,
    total_games: totalGamesCount,
    total_platinums: finalPlats,
    global_level: Math.floor(finalCoins / 1000) + 1,
    last_steam_sync: new Date().toISOString()
  }).eq('id', user.id)

  revalidatePath('/integrations')
  revalidatePath('/dashboard')
  revalidatePath('/profile')
}