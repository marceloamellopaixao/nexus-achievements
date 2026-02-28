'use server'

import { createClient } from '@/utils/supabase/server'
import {
    exchangeNpssoForAccessCode,
    exchangeAccessCodeForAuthTokens,
    getUserTitles,
    getProfileFromUserName,
    makeUniversalSearch
} from 'psn-api'

// Tipagem segura do jogo que a Sony retorna
interface TitleThin {
    npCommunicationId: string;
    trophyTitleName: string;
    trophyTitleIconUrl: string;
    progress: number;
    earnedTrophies: { bronze: number; silver: number; gold: number; platinum: number };
    definedTrophies: { bronze: number; silver: number; gold: number; platinum: number };
}

export async function syncPlayStationGames(platformUserId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { coins: 0, plats: 0 }

    const npsso = process.env.PSN_NPSSO_TOKEN
    if (!npsso) {
        console.error("❌ [PSN] PSN_NPSSO_TOKEN não configurado no .env")
        return { coins: 0, plats: 0 }
    }

    let totalCoins = 0;
    let totalPlats = 0;

    try {
        console.log(`\n========================================================`)
        console.log(`📡 [PSN NEXUS-SYNC] INICIANDO VARREDURA: ${platformUserId}`)
        console.log(`========================================================\n`)

        // 1. Autenticação do Robô
        const accessCode = await exchangeNpssoForAccessCode(npsso)
        const authorization = await exchangeAccessCodeForAuthTokens(accessCode)
        let accountId = null;

        // 2. Busca Sniper Direta
        try {
            const profileResponse = await getProfileFromUserName(authorization, platformUserId);
            if (profileResponse?.profile?.accountId) accountId = profileResponse.profile.accountId;
        } catch (e) {
            // Ignora erro e passa para busca rede
            console.warn(`⚠️ [PSN] Busca direta falhou para "${platformUserId}". Tentando busca em rede...`);
            console.warn(`   ↳ Detalhes do erro:`, e instanceof Error ? e.message : e);
        }

        // 3. Busca Rede Universal (Fallback)
        if (!accountId) {
            const searchResult = await makeUniversalSearch(authorization, platformUserId, 'SocialAllAccounts')
            const resultsArray = searchResult.domainResponses[0]?.results || []
            const targetMatch = resultsArray.find(
                (r: { socialMetadata?: { onlineId?: string } }) => r.socialMetadata?.onlineId?.toLowerCase() === platformUserId.toLowerCase()
            )
            if (targetMatch?.socialMetadata?.accountId) accountId = targetMatch.socialMetadata.accountId;
        }

        if (!accountId) {
            console.log(`❌ [PSN] Erro: Conta "${platformUserId}" não encontrada na PSN ou totalmente privada.`);
            return { coins: 0, plats: 0 }
        }

        console.log(`✅ [PSN] Alvo Confirmado! AccountID: ${accountId}\n`)

        // 4. Puxando a Biblioteca do Usuário
        const { trophyTitles } = await getUserTitles(authorization, accountId)

        if (!trophyTitles || trophyTitles.length === 0) {
            console.log(`⚠️ [PSN] Nenhum jogo público encontrado no perfil.`);
            return { coins: 0, plats: 0 }
        }

        // 5. Processamento Jogo a Jogo com Logs e Anti-Duplicação
        for (const item of trophyTitles) {
            const title = item as unknown as TitleThin;

            // Ignora jogos não iniciados
            if (title.progress === 0) continue;

            const gameId = `psn-${title.npCommunicationId}`
            const earned = title.earnedTrophies
            const defined = title.definedTrophies

            const unlockedCount = earned.bronze + earned.silver + earned.gold + earned.platinum
            const totalCount = defined.bronze + defined.silver + defined.gold + defined.platinum
            const isPlat = earned.platinum > 0

            // LOG INICIAL DO JOGO
            console.log(`🎮 Jogo Resgatado: ${title.trophyTitleName}`);
            console.log(`   ↳ Progresso: ${unlockedCount}/${totalCount} (${title.progress}%) | Platinado: ${isPlat ? 'Sim 🏆' : 'Não'}`);

            // Atualiza Catálogo de Jogos (Games)
            await supabase.from('games').upsert({
                id: gameId,
                title: title.trophyTitleName,
                cover_url: title.trophyTitleIconUrl,
                banner_url: title.trophyTitleIconUrl,
                platform: 'PlayStation',
                total_achievements: totalCount
            }, { onConflict: 'id' })

            // Busca os dados antigos do usuário neste jogo
            const { data: existingRecord } = await supabase.from('user_games').select('unlocked_achievements, is_platinum').eq('user_id', user.id).eq('game_id', gameId).maybeSingle()
            
            const previousUnlocked = existingRecord?.unlocked_achievements || 0
            const wasPlat = existingRecord?.is_platinum || false

            // Atualiza Biblioteca do Usuário (User Games)
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

            let gameCoinsEarned = 0;
            let gamePlatsEarned = 0;

            // 🔥 A MÁGICA ANTI-EXPLOIT DE MOEDAS 🔥
            if (unlockedCount > previousUnlocked) {
                // 1. Calcula o total de pontos que ele DEVERIA ter com a PSN hoje
                const expectedBaseCoins = (earned.bronze * 5) + (earned.silver * 10) + (earned.gold * 25);
                
                // 2. Busca os pontos que já demos a ele no passado no banco do Nexus
                const { data: pastActivities } = await supabase.from('global_activity')
                    .select('points_earned, rarity')
                    .eq('user_id', user.id)
                    .eq('game_id', gameId);
                    
                let alreadyRegisteredCoins = 0;
                pastActivities?.forEach(act => {
                    // Ignora as platinas na soma base para não estragar a matemática
                    if (act.rarity !== 'platinum') {
                        alreadyRegisteredCoins += act.points_earned;
                    }
                });

                // 3. Apenas a diferença é depositada!
                const coinsToAward = expectedBaseCoins - alreadyRegisteredCoins;

                if (coinsToAward > 0) {
                    gameCoinsEarned += coinsToAward;
                    
                    await supabase.from('global_activity').insert({
                        user_id: user.id,
                        game_id: gameId,
                        game_name: title.trophyTitleName,
                        achievement_name: `Sincronização PlayStation (+${unlockedCount - previousUnlocked} Troféus)`,
                        achievement_icon: title.trophyTitleIconUrl,
                        rarity: 'silver', // Rastreio genérico para o pacote
                        points_earned: coinsToAward,
                        platform: 'PlayStation'
                    })
                }
            }

            // Tratamento isolado e seguro para a Platina
            if (isPlat && !wasPlat) {
                gamePlatsEarned += 1;
                gameCoinsEarned += 100;

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

            // LOG DE RESULTADO DO JOGO
            if (gameCoinsEarned > 0) {
                console.log(`   ↳ 💰 Nexus Coins Injetados: +${gameCoinsEarned} | Novas Platinas: +${gamePlatsEarned}\n`);
            } else {
                console.log(`   ↳ ✔️ Banco já atualizado. Nenhum coin extra adicionado.\n`);
            }

            totalCoins += gameCoinsEarned;
            totalPlats += gamePlatsEarned;
        }

        console.log(`========================================================`)
        console.log(`🏁 [PSN] SINCRONIZAÇÃO FINALIZADA`)
        console.log(`💰 Total Coins: +${totalCoins} | 🏆 Total Plats: +${totalPlats}`)
        console.log(`========================================================\n`)

        return { coins: totalCoins, plats: totalPlats }

    } catch (err) {
        console.error(`❌ [PSN] Erro Fatal na Sincronização:`, err)
        return { coins: 0, plats: 0 }
    }
}