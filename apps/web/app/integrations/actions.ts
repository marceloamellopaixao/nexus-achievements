'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// --- INTERFACES DE TIPAGEM ESTRITA ---
interface SteamGame {
  appid: number;
  name: string;
  playtime_forever: number;
  rtime_last_played?: number;
  img_icon_url?: string;
}

interface SteamAchievement {
  apiname: string;
  achieved: number;
  unlocktime: number;
}

interface SteamSchemaAchievement {
  name: string;
  displayName: string;
  icon: string;
}

interface SteamGlobalPercentage {
  name: string;
  percent: number;
}

const SGDB_KEY = process.env.STEAMGRIDDB_API_KEY;

async function getBackupImage(appId: string, type: 'grids' | 'heroes' | 'logos') {
  if (!SGDB_KEY) return null;
  try {
    const response = await fetch(`https://www.steamgriddb.com/api/v2/${type}/steam/${appId}`, {
      headers: { 'Authorization': `Bearer ${SGDB_KEY}` }
    });
    const resData = await response.json();
    return resData.success && resData.data.length > 0 ? resData.data[0].url : null;
  } catch { return null; }
}

export async function saveSteamId(steamId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }
  const { error } = await supabase.from('users').update({ steam_id: steamId }).eq('id', user.id)
  if (error) return { error: 'Erro ao salvar Steam ID.' }
  revalidatePath('/integrations')
  return { success: 'Steam ID vinculada!' }
}

// 2. BUSCA LISTA DE JOGOS (MELHORADO PARA FAMILY SHARING)
export async function fetchSteamGamesList() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const { data: userData } = await supabase.from('users').select('steam_id').eq('id', user.id).single()
  if (!userData?.steam_id) return { error: 'Nenhuma Steam ID vinculada.' }

  const STEAM_KEY = process.env.STEAM_API_KEY
  const steamId = userData.steam_id

  try {
    // Busca jogos próprios + Busca jogos jogados recentemente (captura Family Sharing)
    const [ownedRes, recentRes] = await Promise.all([
      fetch(`http://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/?key=${STEAM_KEY}&steamid=${steamId}&format=json&include_appinfo=1&include_played_free_games=1`),
      fetch(`http://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v0001/?key=${STEAM_KEY}&steamid=${steamId}&format=json`)
    ])

    const ownedData = await ownedRes.json()
    const recentData = await recentRes.json()

    const gamesMap = new Map<number, SteamGame>()
    ownedData.response?.games?.forEach((g: SteamGame) => gamesMap.set(g.appid, g))
    recentData.response?.games?.forEach((g: SteamGame) => {
      if (!gamesMap.has(g.appid)) gamesMap.set(g.appid, g)
    })

    const finalGamesList = Array.from(gamesMap.values())
      .filter((g) => g.playtime_forever > 0)
      .sort((a, b) => (b.rtime_last_played || 0) - (a.rtime_last_played || 0))

    return { games: finalGamesList, steamId }
  } catch { return { error: 'Falha ao buscar dados na Steam.' } }
}

// 3. PROCESSA UM ÚNICO JOGO (TIPAGEM CORRIGIDA)
export async function processSingleGame(game: SteamGame, steamId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { coins: 0, plats: 0 }

  const STEAM_KEY = process.env.STEAM_API_KEY
  const appId = game.appid.toString()
  const steamGameId = `steam-${appId}`

  try {
    const res = await fetch(`http://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/?appid=${appId}&key=${STEAM_KEY}&steamid=${steamId}`)
    const data = await res.json()
    if (!data?.playerstats?.success) return { coins: 0, plats: 0 }

    const achievements: SteamAchievement[] = data.playerstats.achievements || []
    if (achievements.length === 0) return { coins: 0, plats: 0 }

    const unlockedAchievements = achievements.filter(a => a.achieved === 1).sort((a, b) => b.unlocktime - a.unlocktime)
    const unlockedCount = unlockedAchievements.length
    const totalCount = achievements.length
    const isPlat = unlockedCount === totalCount && totalCount > 0

    // Upsert do Jogo
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
    await supabase.from('games').upsert({ id: steamGameId, title: game.name, cover_url: coverUrl, banner_url: bannerUrl, total_achievements: totalCount }, { onConflict: 'id' })

    const { data: existingRecord } = await supabase.from('user_games').select('id, unlocked_achievements, is_platinum').eq('user_id', user.id).eq('game_id', steamGameId).maybeSingle()
    const previousUnlocked = existingRecord?.unlocked_achievements || 0
    const wasPlat = existingRecord?.is_platinum || false

    if (existingRecord) {
      await supabase.from('user_games').update({ playtime_minutes: game.playtime_forever, unlocked_achievements: unlockedCount, total_achievements: totalCount, is_platinum: isPlat }).eq('id', existingRecord.id)
    } else {
      await supabase.from('user_games').insert({ user_id: user.id, game_id: steamGameId, playtime_minutes: game.playtime_forever, unlocked_achievements: unlockedCount, total_achievements: totalCount, is_platinum: isPlat })
    }

    let newCoins = 0, newPlats = 0;

    if (unlockedCount > previousUnlocked) {
      // Busca Schema e Porcentagens com Tipagem Segura
      const schemaMap = new Map<string, { displayName: string, icon: string }>()
      const schemaRes = await fetch(`http://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?key=${STEAM_KEY}&appid=${appId}`)
      if (schemaRes.ok) {
        const schemaData = await schemaRes.json()
        const schemaAchs: SteamSchemaAchievement[] = schemaData?.game?.availableGameStats?.achievements || []
        schemaAchs.forEach((a) => schemaMap.set(a.name, { displayName: a.displayName, icon: a.icon }))
      }

      const percentagesMap = new Map<string, number>()
      const percentRes = await fetch(`http://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v0002/?gameid=${appId}`)
      if (percentRes.ok) {
        const percentData = await percentRes.json()
        const percentList: SteamGlobalPercentage[] = percentData?.achievementpercentages?.achievements || []
        percentList.forEach((p) => percentagesMap.set(p.name, p.percent))
      }

      const activitiesToInsert = []
      const newOnes = unlockedAchievements.slice(0, unlockedCount - previousUnlocked)

      for (const ach of newOnes) {
        const percent = percentagesMap.get(ach.apiname) || 100
        let rarity = 'bronze', pts = 5;
        if (percent <= 10) { rarity = 'gold'; pts = 25; }
        else if (percent <= 50) { rarity = 'silver'; pts = 10; }
        newCoins += pts
        activitiesToInsert.push({
          user_id: user.id, game_id: steamGameId, game_name: game.name,
          achievement_name: schemaMap.get(ach.apiname)?.displayName || ach.apiname,
          achievement_icon: schemaMap.get(ach.apiname)?.icon || null,
          rarity, points_earned: pts, platform: 'Steam', created_at: new Date(ach.unlocktime * 1000).toISOString()
        })
      }

      if (isPlat && !wasPlat) {
        newPlats = 1; newCoins += 100;
        activitiesToInsert.push({
          user_id: user.id, game_id: steamGameId, game_name: game.name, achievement_name: '🏆 PLATINOU O JOGO!',
          achievement_icon: 'platinum_ps5', rarity: 'platinum', points_earned: 100, platform: 'Steam'
        })
      }

      if (activitiesToInsert.length > 0) {
        await supabase.from('global_activity').upsert(activitiesToInsert, { onConflict: 'user_id, game_id, achievement_name' })
      }
    }
    return { coins: newCoins, plats: newPlats }
  } catch { return { coins: 0, plats: 0 } }
}

// 4. AÇÃO PARA SINCRONIZAR JOGO ESPECÍFICO (PARA JOGOS DE FAMÍLIA ANTIGOS)
export async function syncSpecificGame(appId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const { data: userData } = await supabase.from('users').select('steam_id').eq('id', user.id).single()
  if (!userData?.steam_id) return { error: 'Vincule sua Steam ID' }

  // Cria um objeto de jogo "falso" para processar
  const fakeGame: SteamGame = { appid: Number(appId), name: "Sincronização Manual", playtime_forever: 1 };
  const result = await processSingleGame(fakeGame, userData.steam_id);

  await finalizeSync(result.coins, result.plats, 0); // O 0 não altera o total de jogos
  return { success: true, message: `Processado: +${result.coins} moedas e ${result.plats} platinas!` }
}

export async function finalizeSync(totalCoinsEarned: number, totalPlatsEarned: number, totalGamesCount: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: userData } = await supabase.from('users').select('nexus_coins, total_platinums, total_games').eq('id', user.id).single()

  await supabase.from('users').update({
    nexus_coins: (userData?.nexus_coins || 0) + totalCoinsEarned,
    total_platinums: (userData?.total_platinums || 0) + totalPlatsEarned,
    total_games: totalGamesCount > 0 ? totalGamesCount : (userData?.total_games || 0),
    last_steam_sync: new Date().toISOString()
  }).eq('id', user.id)

  revalidatePath('/integrations'); revalidatePath('/profile');
}