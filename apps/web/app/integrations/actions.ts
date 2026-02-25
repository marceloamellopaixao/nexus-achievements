'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// ==========================================
// APLICAÇÃO DE LÓGICA DE NEGÓCIOS RELACIONADA ÀS INTEGRAÇÕES (STEAM, CONSOLES FUTUROS, ETC)
// SOMENTE PARA TESTES ESTE CÓDIGO
// ==========================================


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

// ==========================================
// 1. SISTEMA DE BUSCA SGDB COM LOGS E DIMENSÕES
// ==========================================
async function getBackupImage(appId: string, type: 'grids' | 'heroes' | 'logos') {
  if (!SGDB_KEY) {
    console.log(`[SGDB] ERRO: Chave STEAMGRIDDB_API_KEY não foi encontrada no arquivo .env!`);
    return null;
  }

  try {
    let url = `https://www.steamgriddb.com/api/v2/${type}/steam/${appId}`;

    if (type === 'grids') {
      url += '?dimensions=600x900';
    } else if (type === 'heroes') {
      url += '?dimensions=1920x620';
    }

    console.log(`[SGDB] Procurando ${type} para o jogo ${appId} (Dimensões forçadas)...`);

    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${SGDB_KEY}` }
    });

    const resData = await response.json();

    if (resData.success && resData.data && resData.data.length > 0) {
      console.log(`[SGDB] SUCESSO! ${type} encontrada:`, resData.data[0].url);
      return resData.data[0].url;
    } else {
      console.log(`[SGDB] FALHA para ${appId} (${type}). Motivo:`, JSON.stringify(resData));
      return null;
    }
  } catch (err) {
    console.error(`[SGDB] ERRO CRÍTICO no servidor ao contactar SteamGridDB:`, err);
    return null;
  }
}

// 🔥 NOVIDADE MODO TESTE: Extrai o Nome de Usuário (personaname) da Steam!
export async function saveSteamId(steamId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  let steamUsername = steamId; // Fallback caso a API falhe
  const STEAM_KEY = process.env.STEAM_API_KEY;

  if (STEAM_KEY) {
    try {
      const res = await fetch(`http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAM_KEY}&steamids=${steamId}`);
      const data = await res.json();
      if (data?.response?.players?.[0]?.personaname) {
        steamUsername = data.response.players[0].personaname;
      }
    } catch (err) {
      console.error("Erro ao buscar Steam Username", err);
    }
  }

  // Salva o ID numérico na tabela de usuários para sincronização
  const { error } = await supabase.from('users').update({ steam_id: steamId }).eq('id', user.id)
  if (error) return { error: 'Erro ao salvar Steam ID.' }

  // Salva o Nome de Usuário legível nas contas vinculadas para exibição no Perfil
  const { data: existing } = await supabase.from('linked_accounts').select('id').eq('user_id', user.id).eq('platform', 'Steam').maybeSingle()
  if (existing) {
    await supabase.from('linked_accounts').update({ platform_user_id: steamId, platform_username: steamUsername }).eq('id', existing.id)
  } else {
    await supabase.from('linked_accounts').insert({ user_id: user.id, platform: 'Steam', platform_user_id: steamId, platform_username: steamUsername })
  }

  revalidatePath('/integrations')
  revalidatePath('/profile', 'layout')
  return { success: 'Steam ID vinculada com sucesso!', username: steamUsername }
}

export async function fetchSteamGamesList() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const { data: userData } = await supabase.from('users').select('steam_id').eq('id', user.id).single()
  if (!userData?.steam_id) return { error: 'Nenhuma Steam ID vinculada.' }

  const STEAM_KEY = process.env.STEAM_API_KEY
  const steamId = userData.steam_id

  try {
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

export async function processSingleGame(game: SteamGame, steamId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { coins: 0, plats: 0 }

  const STEAM_KEY = process.env.STEAM_API_KEY
  const appId = game.appid.toString()
  const steamGameId = `steam-${appId}`

  console.log(`\n===========================================`);
  console.log(`PROCESSANDO JOGO: ${game.name} (${appId})`);
  console.log(`===========================================`);

  try {
    const res = await fetch(`http://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/?appid=${appId}&key=${STEAM_KEY}&steamid=${steamId}&l=brazilian`)
    const data = await res.json()
    if (!data?.playerstats?.success) return { coins: 0, plats: 0 }

    const achievements: SteamAchievement[] = data.playerstats.achievements || []
    if (achievements.length === 0) return { coins: 0, plats: 0 }

    // Ordenamos da mais recente para a mais antiga (b - a)
    const unlockedAchievements = achievements.filter(a => a.achieved === 1).sort((a, b) => b.unlocktime - a.unlocktime)
    const unlockedCount = unlockedAchievements.length
    const totalCount = achievements.length
    const isPlat = unlockedCount === totalCount && totalCount > 0

    // Calcula a data exata da platina na Steam
    let platinumUnlockedAt = null;
    if (isPlat && unlockedCount > 0) {
      platinumUnlockedAt = new Date(unlockedAchievements[0]!.unlocktime * 1000).toISOString();
    }

    // OTIMIZAÇÃO SÉNIOR: Verifica se o jogo já está no banco ANTES de chamar APIs externas
    const { data: existingGame } = await supabase
      .from('games')
      .select('cover_url, banner_url, categories')
      .eq('id', steamGameId)
      .maybeSingle();

    let coverUrl = existingGame?.cover_url;
    let bannerUrl = existingGame?.banner_url;
    let gameCategories = existingGame?.categories || [];

    // Só procura imagens novas se elas não existirem no nosso banco
    if (!coverUrl || !bannerUrl) {
      console.log(`[Cache] Imagens em falta. Procurando arte Premium no SteamGridDB...`);

      if (!coverUrl) coverUrl = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/library_600x900.jpg`;
      if (!bannerUrl) bannerUrl = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`;

      if (!existingGame?.cover_url) {
        const premiumCover = await getBackupImage(appId, 'grids');
        if (premiumCover) coverUrl = premiumCover;
      }

      if (!existingGame?.banner_url) {
        const premiumBanner = await getBackupImage(appId, 'heroes');
        if (premiumBanner) bannerUrl = premiumBanner;
      }
    } else {
      console.log(`[Cache] Artes já existem no banco. Pulando SGDB!`);
    }

    // Só procura categorias se elas não existirem no nosso banco
    if (!gameCategories || gameCategories.length === 0) {
      try {
        console.log(`[Cache] Categorias em falta. Buscando na Loja Steam...`);
        const storeRes = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}&l=portuguese`);
        if (storeRes.ok) {
          const storeData = await storeRes.json();
          if (storeData?.[appId]?.success) {
            gameCategories = storeData[appId].data.genres?.map((g: { id: string; description: string }) => g.description) || [];
          }
        }
      } catch (error) {
        console.log(`Falha ao buscar categorias para o jogo ${appId}.`, error);
      }
    } else {
      console.log(`[Cache] Categorias já existem. Pulando Steam Store!`);
    }

    // Salva o jogo preservando as capas do admin e atualizando apenas os Totais
    await supabase.from('games').upsert({
      id: steamGameId,
      title: game.name,
      cover_url: coverUrl,
      banner_url: bannerUrl,
      total_achievements: totalCount,
      platform: 'Steam',
      categories: gameCategories
    }, { onConflict: 'id' })

    const { data: existingRecord } = await supabase.from('user_games').select('id, unlocked_achievements, is_platinum').eq('user_id', user.id).eq('game_id', steamGameId).maybeSingle()
    const previousUnlocked = existingRecord?.unlocked_achievements || 0
    const wasPlat = existingRecord?.is_platinum || false

    // Atualiza ou insere o registro do usuário
    if (existingRecord) {
      await supabase.from('user_games').update({
        playtime_minutes: game.playtime_forever,
        unlocked_achievements: unlockedCount,
        total_achievements: totalCount,
        is_platinum: isPlat,
        platinum_unlocked_at: platinumUnlockedAt
      }).eq('id', existingRecord.id)
    } else {
      await supabase.from('user_games').insert({
        user_id: user.id,
        game_id: steamGameId,
        playtime_minutes: game.playtime_forever,
        unlocked_achievements: unlockedCount,
        total_achievements: totalCount,
        is_platinum: isPlat,
        platinum_unlocked_at: platinumUnlockedAt
      })
    }

    if (unlockedCount > previousUnlocked) {
      const schemaMap = new Map<string, { displayName: string, icon: string }>()

      const schemaRes = await fetch(`http://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?key=${STEAM_KEY}&appid=${appId}&l=brazilian`)
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

        activitiesToInsert.push({
          user_id: user.id, game_id: steamGameId, game_name: game.name,
          achievement_name: schemaMap.get(ach.apiname)?.displayName || ach.apiname,
          achievement_icon: schemaMap.get(ach.apiname)?.icon || null,
          rarity, points_earned: pts, platform: 'Steam', created_at: new Date(ach.unlocktime * 1000).toISOString()
        })
      }

      if (isPlat && !wasPlat) {
        activitiesToInsert.push({
          user_id: user.id, game_id: steamGameId, game_name: game.name, achievement_name: '🏆 PLATINOU O JOGO!',
          achievement_icon: 'platinum_ps5', rarity: 'platinum', points_earned: 100, platform: 'Steam',
          created_at: new Date().toISOString()
        })
      }

      if (activitiesToInsert.length > 0) {
        await supabase.from('global_activity').upsert(activitiesToInsert, { onConflict: 'user_id, game_id, achievement_name' })
      }
    }

    // MODO TESTE (SEM MOEDAS):
    return { coins: 0, plats: 0 }
  } catch (err) {
    console.error(`ERRO GERAL NO JOGO ${game.name}:`, err)
    return { coins: 0, plats: 0 }
  }
}

export async function syncSpecificGame(appId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  const { data: userData } = await supabase.from('users').select('steam_id').eq('id', user.id).single()
  if (!userData?.steam_id) return { error: 'Vincule sua Steam ID' }

  const fakeGame: SteamGame = { appid: Number(appId), name: "Sincronização Manual", playtime_forever: 1 };
  const result = await processSingleGame(fakeGame, userData.steam_id);

  await finalizeSync(result.coins, result.plats, 0);
  return { success: true, message: `Processado: +${result.coins} moedas e ${result.plats} platinas!` }
}

export async function finalizeSync(totalCoinsEarned: number, totalPlatsEarned: number, totalGamesCount: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: userData } = await supabase.from('users').select('nexus_coins, total_platinums, total_games').eq('id', user.id).single()

  await supabase.from('users').update({
    nexus_coins: userData?.nexus_coins || 0, // MODO TESTE
    total_platinums: userData?.total_platinums || 0, // MODO TESTE
    total_games: totalGamesCount > 0 ? totalGamesCount : (userData?.total_games || 0),
    last_steam_sync: new Date().toISOString()
  }).eq('id', user.id)

  revalidatePath('/integrations'); revalidatePath('/profile');
}

export async function linkPlatformAccount(platform: string, platformUserId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }
  if (!platformUserId.trim()) return { error: 'ID de usuário inválida.' }

  const { data: existing } = await supabase
    .from('linked_accounts')
    .select('id')
    .eq('user_id', user.id)
    .eq('platform', platform)
    .maybeSingle()

  if (existing) {
    // Para consoles, como não temos a API nativa agora, o ID e o Nome são os mesmos
    const { error } = await supabase.from('linked_accounts').update({ platform_user_id: platformUserId.trim(), platform_username: platformUserId.trim() }).eq('id', existing.id)
    if (error) return { error: 'Erro ao atualizar conta.' }
  } else {
    const { error } = await supabase.from('linked_accounts').insert({ user_id: user.id, platform, platform_user_id: platformUserId.trim(), platform_username: platformUserId.trim() })
    if (error) return { error: 'Erro ao vincular conta.' }
  }

  revalidatePath('/integrations')
  revalidatePath('/profile', 'layout')
  return { success: `Conta da ${platform} vinculada com sucesso!` }
}