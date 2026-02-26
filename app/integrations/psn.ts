'use server'

import { createClient } from '@/utils/supabase/server'
import {
    exchangeNpssoForAccessCode,
    exchangeAccessCodeForAuthTokens,
    getUserTitles,
    getProfileFromUserName,
    makeUniversalSearch
} from 'psn-api'

// Tipagem segura mantida
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

        let accountId = null;

        // 2. BUSCA SNIPER: Tenta pegar o perfil direto pelo nome exato
        try {
            console.log(`[PSN DEBUG] Tentativa 1: Busca Direta pelo Nickname...`);
            const profileResponse = await getProfileFromUserName(authorization, platformUserId);
            if (profileResponse?.profile?.accountId) {
                accountId = profileResponse.profile.accountId;
                console.log(`✅ [PSN] Sucesso na Busca Direta! AccountID: ${accountId}`);
            }
        } catch (e) {
            console.log(`⚠️ [PSN DEBUG] Busca Direta falhou. O perfil pode ser privado ou a API Legado recusou.`);
            console.error(`❌ [PSN DEBUG] Erro na Busca Direta:`, e);
        }

        // 3. BUSCA REDE: Se a busca direta falhar, usamos o Motor de Busca Universal
        if (!accountId) {
            console.log(`[PSN DEBUG] Tentativa 2: Busca Universal (Motor de Pesquisa)...`);
            const searchResult = await makeUniversalSearch(
                authorization,
                platformUserId,
                'SocialAllAccounts'
            )

            const resultsArray = searchResult.domainResponses[0]?.results || []
            const targetMatch = resultsArray.find(
                (r: { socialMetadata?: { onlineId?: string } }) => r.socialMetadata?.onlineId?.toLowerCase() === platformUserId.toLowerCase()
            )

            if (targetMatch?.socialMetadata?.accountId) {
                accountId = targetMatch.socialMetadata.accountId;
                console.log(`✅ [PSN] Sucesso na Busca Universal! AccountID: ${accountId}`);
            }
        }

        // Se após as duas tentativas continuarmos sem ID, abortamos.
        if (!accountId) {
            console.log(`❌ [PSN] Erro Fatal: Conta não encontrada em nenhum método.`);
            console.log(`👉 VERIFICAÇÃO: Você tem a certeza que o Nickname da PSN é exatamente "${platformUserId}"?`);
            return { coins: 0, plats: 0 }
        }

        // 4. Busca a lista de jogos jogados pelo usuário usando o AccountID
        const { trophyTitles } = await getUserTitles(authorization, accountId)

        if (!trophyTitles || trophyTitles.length === 0) {
            console.log(`⚠️ [PSN] Nenhum jogo público encontrado ou Conta tem os troféus ocultos na privacidade.`);
            return { coins: 0, plats: 0 }
        }

        // 5. Processa os jogos e converte Troféus em Nexus Coins
        for (const item of trophyTitles) {
            const title = item as unknown as TitleThin;

            // Ignora jogos com 0% de progresso
            if (title.progress === 0) continue;

            const gameId = `psn-${title.npCommunicationId}`

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
                banner_url: title.trophyTitleIconUrl,
                platform: 'PlayStation',
                total_achievements: totalCount
            }, { onConflict: 'id' })

            // Verifica progresso anterior
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

            // Calcula moedas
            if (unlockedCount > previousUnlocked) {
                const newTrophies = unlockedCount - previousUnlocked;
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