'use server'

import { createClient } from '@/utils/supabase/server'
import { 
  exchangeNpssoForAccessCode, 
  exchangeAccessCodeForAuthTokens, 
  getUserTitles, 
  makeUniversalSearch,
} from 'psn-api'

export async function syncPlayStationGames(platformUserId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { coins: 0, plats: 0 }

  const npsso = process.env.PSN_NPSSO_TOKEN
  if (!npsso) {
    console.error("❌ PSN_NPSSO_TOKEN não configurado no .env")
    return { coins: 0, plats: 0 }
  }

  let totalCoins = 0;
  let totalPlats = 0;

  try {
    console.log(`\n===========================================`)
    console.log(`🎮 [PSN] INICIANDO SINCRONIZAÇÃO: ${platformUserId}`)
    console.log(`===========================================\n`)
    
    // 1. Autentica o nosso "Robô" na Sony
    const accessCode = await exchangeNpssoForAccessCode(npsso)
    const authorization = await exchangeAccessCodeForAuthTokens(accessCode)

    // 2. Transforma a Gamertag (ex: cacador_psn) num AccountID interno da Sony
    const searchResult = await makeUniversalSearch(
      authorization,
      platformUserId,
      'SocialAllAccounts'
    )

    const targetUser = searchResult.domainResponses[0]?.results[0]?.socialMetadata
    if (!targetUser || !targetUser.accountId) {
      console.log(`❌ [PSN] Usuário ${platformUserId} não encontrado ou perfil privado.`)
      return { coins: 0, plats: 0 }
    }

    const accountId = targetUser.accountId;
    console.log(`✅ [PSN] Conta encontrada! AccountID: ${accountId}`)

    // 3. Busca a lista de jogos jogados pelo usuário
    const { trophyTitles } = await getUserTitles(authorization, accountId)
    
    if (!trophyTitles || trophyTitles.length === 0) {
      console.log(`⚠️ [PSN] Nenhum jogo público encontrado.`)
      return { coins: 0, plats: 0 }
    }

    // 4. Processa os jogos e converte Troféus em Nexus Coins
    for (const title of trophyTitles) {
      // Ignora jogos com 0% de progresso
      if (title.progress === 0) continue;

      const gameId = `psn-${title.npCommunicationId}`
      
      // Mapeamento de Troféus (Ouro da PSN vale 25 Nexus Coins, Platina 100, etc.)
      const earnedTrophies = title.earnedTrophies
      const definedTrophies = title.definedTrophies
      
      const unlockedCount = earnedTrophies.bronze + earnedTrophies.silver + earnedTrophies.gold + earnedTrophies.platinum
      const totalCount = definedTrophies.bronze + definedTrophies.silver + definedTrophies.gold + definedTrophies.platinum
      const isPlat = earnedTrophies.platinum > 0

      // Cadastra o Jogo Globalmente no Banco
      await supabase.from('games').upsert({
        id: gameId,
        title: title.trophyTitleName,
        cover_url: title.trophyTitleIconUrl,
        banner_url: title.trophyTitleIconUrl, // PSN não dá banner fácil, usamos o ícone
        platform: 'PlayStation',
        total_achievements: totalCount
      }, { onConflict: 'id' })

      // Verifica progresso anterior para não dar moedas duplicadas
      const { data: existingRecord } = await supabase.from('user_games').select('unlocked_achievements, is_platinum').eq('user_id', user.id).eq('game_id', gameId).maybeSingle()
      
      const previousUnlocked = existingRecord?.unlocked_achievements || 0
      const wasPlat = existingRecord?.is_platinum || false

      // Salva progresso do usuário
      if (existingRecord) {
        await supabase.from('user_games').update({ 
          unlocked_achievements: unlockedCount, 
          total_achievements: totalCount, 
          is_platinum: isPlat 
        }).eq('user_id', user.id).eq('game_id', gameId)
      } else {
        await supabase.from('user_games').insert({ 
          user_id: user.id, 
          game_id: gameId, 
          unlocked_achievements: unlockedCount, 
          total_achievements: totalCount, 
          is_platinum: isPlat 
        })
      }

      // Calcula moedas baseadas na diferença (Matemática simplificada para performance)
      if (unlockedCount > previousUnlocked) {
        const newTrophies = unlockedCount - previousUnlocked;
        // Média conservadora: assumimos que a maioria são bronzes (5 moedas) para não pesar o servidor buscando troféu a troféu
        totalCoins += (newTrophies * 5); 
      }

      if (isPlat && !wasPlat) {
        totalPlats += 1;
        totalCoins += 100;
        
        await supabase.from('global_activity').insert({
          user_id: user.id,
          game_id: gameId,
          game_name: title.trophyTitleName,
          achievement_name: '🏆 PLATINA CONQUISTADA!',
          achievement_icon: title.trophyTitleIconUrl,
          rarity: 'platinum',
          points_earned: 100,
          platform: 'PlayStation'
        })
      }
    }

    console.log(`✅ [PSN] Concluído! Moedas geradas: ${totalCoins}`)
    console.log(`✅ [PSN] Platinas conquistadas: ${totalPlats}`)
    return { coins: totalCoins, plats: totalPlats }

  } catch (err) {
    console.error(`❌ [PSN] Erro Fatal na Sincronização:`, err)
    return { coins: 0, plats: 0 }
  }
}