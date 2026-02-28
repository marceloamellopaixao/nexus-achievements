'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

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
// 1. SISTEMA DE BUSCA SGDB COM LOGS
// ==========================================
async function getBackupImage(appId: string, type: 'grids' | 'heroes' | 'logos') {
  if (!SGDB_KEY) {
    console.warn(`⚠️ [SGDB] Chave STEAMGRIDDB_API_KEY ausente. Pulando busca premium.`);
    return null;
  }

  try {
    let url = `https://www.steamgriddb.com/api/v2/${type}/steam/${appId}`;
    if (type === 'grids') url += '?dimensions=600x900'; 
    else if (type === 'heroes') url += '?dimensions=1920x620'; 

    const response = await fetch(url, { headers: { 'Authorization': `Bearer ${SGDB_KEY}` } });
    const resData = await response.json();

    if (resData.success && resData.data && resData.data.length > 0) {
      console.log(`   ↳ 🖼️ [SGDB] Arte premium encontrada (${type}).`);
      return resData.data[0].url; 
    }
    
    console.log(`   ↳ 🖼️ [SGDB] Nenhuma arte encontrada para ${appId} (${type}). Usando fallback.`);
    return null;
  } catch (err) {
    console.error(`   ↳ ❌ [SGDB] Erro de rede ao contactar SteamGridDB:`, err);
    return null;
  }
}

// ==========================================
// 2. VINCULAÇÃO DE CONTA STEAM
// ==========================================
export async function saveSteamId(steamId: string) {
  console.log(`\n🔗 [STEAM-LINK] Iniciando vinculação para ID: ${steamId}`);
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.error(`❌ [STEAM-LINK] Erro: Usuário não autenticado.`);
    return { error: 'Não autorizado.' }
  }

  let steamUsername = steamId; 
  const STEAM_KEY = process.env.STEAM_API_KEY;
  
  if (STEAM_KEY) {
    try {
      console.log(`   ↳ 🌐 Buscando Nickname na API da Steam...`);
      const res = await fetch(`http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAM_KEY}&steamids=${steamId}`);
      const data = await res.json();
      if (data?.response?.players?.[0]?.personaname) {
        steamUsername = data.response.players[0].personaname;
        console.log(`   ↳ ✅ Nickname resgatado: ${steamUsername}`);
      } else {
        console.warn(`   ↳ ⚠️ Nickname não encontrado. Perfil privado?`);
      }
    } catch (err) {
      console.error(`   ↳ ❌ Erro ao buscar Nickname na API:`, err);
    }
  }

  console.log(`   ↳ 💾 Salvando vinculação no Banco de Dados...`);
  const { error } = await supabase.from('users').update({ steam_id: steamId }).eq('id', user.id)
  if (error) {
    console.error(`   ↳ ❌ Erro ao atualizar tabela users:`, error.message);
    return { error: 'Erro ao salvar Steam ID.' }
  }

  const { data: existing } = await supabase.from('linked_accounts').select('id').eq('user_id', user.id).eq('platform', 'Steam').maybeSingle()
  if (existing) {
    await supabase.from('linked_accounts').update({ platform_user_id: steamId, platform_username: steamUsername }).eq('id', existing.id)
  } else {
    await supabase.from('linked_accounts').insert({ user_id: user.id, platform: 'Steam', platform_user_id: steamId, platform_username: steamUsername })
  }

  console.log(`✅ [STEAM-LINK] Vinculação concluída com sucesso!`);
  revalidatePath('/integrations')
  revalidatePath('/profile', 'layout')
  return { success: 'Steam ID vinculada com sucesso!', username: steamUsername }
}

// ==========================================
// 3. BUSCA DE LISTA DE JOGOS
// ==========================================
export async function fetchSteamGamesList() {
  console.log(`\n📚 [STEAM-SYNC] Iniciando busca da Biblioteca...`);
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const { data: userData } = await supabase.from('users').select('steam_id').eq('id', user.id).single()
  if (!userData?.steam_id) return { error: 'Nenhuma Steam ID vinculada.' }

  const STEAM_KEY = process.env.STEAM_API_KEY
  const steamId = userData.steam_id

  try {
    console.log(`   ↳ 🌐 Batendo na API da Steam (OwnedGames & RecentlyPlayed)...`);
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

    console.log(`✅ [STEAM-SYNC] Biblioteca carregada. ${finalGamesList.length} jogos encontrados com tempo de jogo.`);
    return { games: finalGamesList, steamId }
  } catch (err) { 
    console.error(`❌ [STEAM-SYNC] Falha ao buscar a biblioteca na Steam:`, err);
    return { error: 'Falha ao buscar dados na Steam.' } 
  }
}

// ==========================================
// 4. PROCESSAMENTO INDIVIDUAL E ANTI-EXPLOIT
// ==========================================
export async function processSingleGame(game: SteamGame, steamId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { coins: 0, plats: 0 }

  const STEAM_KEY = process.env.STEAM_API_KEY
  const appId = game.appid.toString()
  const steamGameId = `steam-${appId}`

  console.log(`\n========================================================`)
  console.log(`🎮 [STEAM] Jogo Resgatado: ${game.name} (${appId})`)

  try {
    const res = await fetch(`http://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/?appid=${appId}&key=${STEAM_KEY}&steamid=${steamId}&l=brazilian`)
    const data = await res.json()
    
    if (!data?.playerstats?.success) {
      console.log(`   ↳ ⚠️ Sem conquistas suportadas ou perfil privado para este jogo.`);
      return { coins: 0, plats: 0 }
    }

    const achievements: SteamAchievement[] = data.playerstats.achievements || []
    if (achievements.length === 0) {
      console.log(`   ↳ ⚠️ O jogo não possui conquistas.`);
      return { coins: 0, plats: 0 }
    }

    const unlockedAchievements = achievements.filter(a => a.achieved === 1).sort((a, b) => b.unlocktime - a.unlocktime)
    const unlockedCount = unlockedAchievements.length
    const totalCount = achievements.length
    const isPlat = unlockedCount === totalCount && totalCount > 0

    console.log(`   ↳ 📊 Progresso: ${unlockedCount}/${totalCount} | Platinado: ${isPlat ? 'Sim 🏆' : 'Não'}`);

    let platinumUnlockedAt = null;
    if (isPlat && unlockedCount > 0) {
      // 🔥 CORREÇÃO EXATA PEDIDA: Forçando o TypeScript a confiar que o index 0 existe!
      platinumUnlockedAt = new Date(unlockedAchievements[0]!.unlocktime * 1000).toISOString();
    }

    console.log(`   ↳ 🔍 Verificando Cache de Imagens e Categorias...`);
    const { data: existingGame } = await supabase.from('games').select('cover_url, banner_url, categories').eq('id', steamGameId).maybeSingle();

    let coverUrl = existingGame?.cover_url;
    let bannerUrl = existingGame?.banner_url;
    let gameCategories = existingGame?.categories || [];

    if (!coverUrl || !bannerUrl) {
      if (!coverUrl) coverUrl = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/library_600x900.jpg`;
      if (!bannerUrl) bannerUrl = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`;
      if (!existingGame?.cover_url) { const premiumCover = await getBackupImage(appId, 'grids'); if (premiumCover) coverUrl = premiumCover; }
      if (!existingGame?.banner_url) { const premiumBanner = await getBackupImage(appId, 'heroes'); if (premiumBanner) bannerUrl = premiumBanner; }
    }

    // 🔥 CORREÇÃO DO BLOCO VAZIO (ESLint no-empty / no-unused-vars)
    if (!gameCategories || gameCategories.length === 0) {
      try {
        const storeRes = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}&l=portuguese`);
        if (storeRes.ok) {
          const storeData = await storeRes.json();
          if (storeData?.[appId]?.success) {
            gameCategories = storeData[appId].data.genres?.map((g: { id: string; description: string }) => g.description) || [];
          }
        }
      } catch (err) {
        console.warn(`   ↳ ⚠️ Aviso: Não foi possível buscar categorias extras na Steam Store.`, err);
      }
    }

    await supabase.from('games').upsert({
      id: steamGameId, title: game.name, cover_url: coverUrl, banner_url: bannerUrl, total_achievements: totalCount, platform: 'Steam', categories: gameCategories
    }, { onConflict: 'id' })

    const { data: existingRecord } = await supabase.from('user_games').select('id, unlocked_achievements, is_platinum').eq('user_id', user.id).eq('game_id', steamGameId).maybeSingle()
    const previousUnlocked = existingRecord?.unlocked_achievements || 0
    const wasPlat = existingRecord?.is_platinum || false

    if (existingRecord) {
      await supabase.from('user_games').update({ 
        playtime_minutes: game.playtime_forever, unlocked_achievements: unlockedCount, total_achievements: totalCount, is_platinum: isPlat, platinum_unlocked_at: platinumUnlockedAt 
      }).eq('id', existingRecord.id)
    } else {
      await supabase.from('user_games').insert({ 
        user_id: user.id, game_id: steamGameId, playtime_minutes: game.playtime_forever, unlocked_achievements: unlockedCount, total_achievements: totalCount, is_platinum: isPlat, platinum_unlocked_at: platinumUnlockedAt 
      })
    }

    let gameCoinsEarned = 0;
    let gamePlatsEarned = 0;

    if (unlockedCount > 0) {
      console.log(`   ↳ 🧮 Executando Motor de Anti-Fraude e Cálculo de Raridade...`);
      
      const percentagesMap = new Map<string, number>()
      const percentRes = await fetch(`http://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v0002/?gameid=${appId}`)
      if (percentRes.ok) {
        const percentData = await percentRes.json()
        const percentList: SteamGlobalPercentage[] = percentData?.achievementpercentages?.achievements || []
        percentList.forEach((p) => percentagesMap.set(p.name, p.percent))
      }

      let expectedBaseCoins = 0;
      const parsedAchievements = [];

      for (const ach of unlockedAchievements) {
        const percent = percentagesMap.get(ach.apiname) || 100
        let rarity = 'bronze', pts = 5;
        if (percent <= 10) { rarity = 'gold'; pts = 25; }
        else if (percent <= 50) { rarity = 'silver'; pts = 10; }
        
        expectedBaseCoins += pts;
        parsedAchievements.push({ ...ach, rarity, pts });
      }

      const { data: pastActivities } = await supabase.from('global_activity')
        .select('points_earned, rarity')
        .eq('user_id', user.id)
        .eq('game_id', steamGameId);

      let alreadyRegisteredCoins = 0;
      pastActivities?.forEach(act => {
        if (act.rarity !== 'platinum') {
          alreadyRegisteredCoins += act.points_earned;
        }
      });

      const coinsToAward = expectedBaseCoins - alreadyRegisteredCoins;
      if (coinsToAward > 0) gameCoinsEarned += coinsToAward;

      console.log(`      • Valor total das conquistas: ${expectedBaseCoins}`);
      console.log(`      • Valor já pago no banco: ${alreadyRegisteredCoins}`);
      console.log(`      • Saldo a injetar agora: ${coinsToAward > 0 ? `+${coinsToAward}` : '0'}`);

      if (unlockedCount > previousUnlocked) {
        console.log(`   ↳ 🌐 Baixando metadados das conquistas novas (nomes/ícones)...`);
        const schemaMap = new Map<string, { displayName: string, icon: string }>()
        const schemaRes = await fetch(`http://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?key=${STEAM_KEY}&appid=${appId}&l=brazilian`)
        if (schemaRes.ok) {
          const schemaData = await schemaRes.json()
          const schemaAchs: SteamSchemaAchievement[] = schemaData?.game?.availableGameStats?.achievements || []
          schemaAchs.forEach((a) => schemaMap.set(a.name, { displayName: a.displayName, icon: a.icon }))
        }

        const activitiesToInsert = [];
        const newOnes = parsedAchievements.slice(0, unlockedCount - previousUnlocked);

        for (const ach of newOnes) {
          activitiesToInsert.push({
            user_id: user.id, game_id: steamGameId, game_name: game.name,
            achievement_name: schemaMap.get(ach.apiname)?.displayName || ach.apiname,
            achievement_icon: schemaMap.get(ach.apiname)?.icon || null,
            rarity: ach.rarity, points_earned: ach.pts, platform: 'Steam', created_at: new Date(ach.unlocktime * 1000).toISOString()
          })
        }

        if (activitiesToInsert.length > 0) {
          await supabase.from('global_activity').upsert(activitiesToInsert, { onConflict: 'user_id, game_id, achievement_name' })
          console.log(`   ↳ 💾 Inseridas ${activitiesToInsert.length} novas conquistas no Feed Global.`);
        }
      }

      if (isPlat && !wasPlat) {
        gamePlatsEarned += 1;
        gameCoinsEarned += 100;
        console.log(`   ↳ 🏆 NOVA PLATINA REGISTRADA! +100 Nexus Coins.`);
        
        await supabase.from('global_activity').insert({
          user_id: user.id, game_id: steamGameId, game_name: game.name, achievement_name: '🏆 PLATINOU O JOGO!',
          achievement_icon: 'platinum_ps5', rarity: 'platinum', points_earned: 100, platform: 'Steam',
          created_at: platinumUnlockedAt || new Date().toISOString()
        })
      }
    }
    
    if (gameCoinsEarned > 0) {
        console.log(`✅ [RESULTADO] 💰 Injetando: +${gameCoinsEarned} Nexus Coins | 🏆 Platinas: +${gamePlatsEarned}`);
    } else {
        console.log(`✅ [RESULTADO] ✔️ Banco Atualizado. Nenhum coin extra adicionado.`);
    }

    return { coins: gameCoinsEarned, plats: gamePlatsEarned }
  } catch (err) {
    console.error(`❌ [STEAM] Erro Catastrófico no jogo ${game.name}:`, err)
    return { coins: 0, plats: 0 }
  }
}

// ==========================================
// 5. FINALIZAÇÃO DA SINCRONIZAÇÃO
// ==========================================
export async function finalizeSync(totalCoinsEarned: number, totalPlatsEarned: number, totalGamesCount: number) {
  console.log(`\n========================================================`);
  console.log(`🏁 [FINALIZAÇÃO] Salvando Totais Finais do Usuário...`);
  console.log(`   ↳ 💰 Total Nexus Coins: +${totalCoinsEarned}`);
  console.log(`   ↳ 🏆 Total Platinas: +${totalPlatsEarned}`);
  
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: userData } = await supabase.from('users').select('nexus_coins, total_platinums, total_games').eq('id', user.id).single()

  const { error } = await supabase.from('users').update({
    nexus_coins: (userData?.nexus_coins || 0) + totalCoinsEarned, 
    total_platinums: (userData?.total_platinums || 0) + totalPlatsEarned, 
    total_games: totalGamesCount > 0 ? totalGamesCount : (userData?.total_games || 0),
    last_steam_sync: new Date().toISOString()
  }).eq('id', user.id)

  if (error) console.error(`❌ [FINALIZAÇÃO] Erro ao salvar saldo final no banco:`, error);
  else console.log(`✅ [FINALIZAÇÃO] Saldo gravado com sucesso! Cofre do Nexus fechado.`);

  console.log(`========================================================\n`);

  revalidatePath('/integrations'); revalidatePath('/profile');
}

export async function linkPlatformAccount(platform: string, platformUserId: string) {
  console.log(`\n🔗 [PLATFORM-LINK] Tentando vincular ${platform} para a ID/User: ${platformUserId}`);
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.error(`❌ Erro: Usuário não autenticado.`);
    return { error: 'Não autorizado.' }
  }
  
  if (!platformUserId.trim()) {
    console.error(`❌ Erro: ID de usuário vazia.`);
    return { error: 'ID de usuário inválida.' }
  }

  const { data: existing } = await supabase
    .from('linked_accounts')
    .select('id')
    .eq('user_id', user.id)
    .eq('platform', platform)
    .maybeSingle()

  if (existing) {
    console.log(`   ↳ Atualizando registro existente...`);
    const { error } = await supabase.from('linked_accounts').update({ platform_user_id: platformUserId.trim(), platform_username: platformUserId.trim() }).eq('id', existing.id)
    if (error) return { error: 'Erro ao atualizar conta.' }
  } else {
    console.log(`   ↳ Criando novo registro de conta...`);
    const { error } = await supabase.from('linked_accounts').insert({ user_id: user.id, platform, platform_user_id: platformUserId.trim(), platform_username: platformUserId.trim() })
    if (error) return { error: 'Erro ao vincular conta.' }
  }
  
  console.log(`✅ [PLATFORM-LINK] Sucesso!`);
  revalidatePath('/integrations')
  revalidatePath('/profile', 'layout')
  return { success: `Conta da ${platform} vinculada com sucesso!` }
}