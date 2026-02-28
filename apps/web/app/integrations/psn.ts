'use server'

import { createClient } from '@/utils/supabase/server'
import {
    exchangeNpssoForAccessCode,
    exchangeAccessCodeForAuthTokens,
    getUserTitles,
    getProfileFromUserName,
    makeUniversalSearch,
    getTitleTrophies,
    getUserTrophiesEarnedForTitle
} from 'psn-api'

// Tipagem segura baseada na resposta da PSN
export interface TitleThin {
    npCommunicationId: string;
    npServiceName: string; 
    trophyTitleName: string;
    trophyTitleIconUrl: string;
    progress: number;
    earnedTrophies: { bronze: number; silver: number; gold: number; platinum: number };
    definedTrophies: { bronze: number; silver: number; gold: number; platinum: number };
}

// Recriamos a tipagem do AuthTokens localmente
interface AuthTokens {
    accessToken: string;
    expiresIn?: number;
    idToken?: string;
    refreshToken?: string;
}

// ==========================================
// 1. BUSCA A LISTA DE JOGOS E DEVOLVE AO FRONTEND
// ==========================================
export async function fetchPlayStationGamesList(platformUserId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Não autorizado.' }

    const npsso = process.env.PSN_NPSSO_TOKEN
    if (!npsso) {
        console.error("❌ [PSN] PSN_NPSSO_TOKEN não configurado no .env")
        return { error: 'Token da PSN ausente no servidor.' }
    }

    try {
        console.log(`\n📚 [PSN-SYNC] Iniciando busca da Biblioteca para: ${platformUserId}`);

        const accessCode = await exchangeNpssoForAccessCode(npsso)
        const authorization = await exchangeAccessCodeForAuthTokens(accessCode)
        let accountId = null;

        try {
            const profileResponse = await getProfileFromUserName(authorization, platformUserId);
            if (profileResponse?.profile?.accountId) accountId = profileResponse.profile.accountId;
        } catch (error) {
            // 🔥 CORREÇÃO 1: Evita o erro 'no-empty' e 'no-unused-vars' do ESLint
            console.warn(`   ↳ ⚠️ Busca direta falhou (perfil pode ser privado). Tentando busca em rede...`, error instanceof Error ? error.message : '');
        }

        if (!accountId) {
            const searchResult = await makeUniversalSearch(authorization, platformUserId, 'SocialAllAccounts')
            const resultsArray = searchResult.domainResponses[0]?.results || []
            const targetMatch = resultsArray.find(
                (r: { socialMetadata?: { onlineId?: string } }) => r.socialMetadata?.onlineId?.toLowerCase() === platformUserId.toLowerCase()
            )
            if (targetMatch?.socialMetadata?.accountId) accountId = targetMatch.socialMetadata.accountId;
        }

        if (!accountId) {
            console.error(`❌ [PSN] Erro: Conta "${platformUserId}" não encontrada ou privada.`);
            return { error: 'Conta PSN não encontrada ou perfil privado.' }
        }

        const allTrophyTitles: TitleThin[] = [];
        let currentOffset = 0;
        const limitPerPage = 250;
        
        while (true) {
            const response = await getUserTitles(authorization, accountId, { limit: limitPerPage, offset: currentOffset })
            const titles = (response.trophyTitles || []) as unknown as TitleThin[];
            allTrophyTitles.push(...titles);
            if (titles.length < limitPerPage) break;
            currentOffset += limitPerPage;
        }

        if (allTrophyTitles.length === 0) {
            return { error: 'Nenhum jogo público encontrado no perfil.' }
        }

        console.log(`✅ [PSN-SYNC] Biblioteca carregada. ${allTrophyTitles.length} jogos encontrados.`);
        
        return { 
            games: allTrophyTitles, 
            accountId, 
            accessToken: authorization.accessToken 
        }

    } catch (err) {
        console.error(`❌ [PSN-SYNC] Falha ao buscar a biblioteca:`, err)
        return { error: 'Erro de comunicação com a Sony.' }
    }
}

// ==========================================
// 2. PROCESSA UM ÚNICO JOGO (Com Conquistas e Ícones)
// ==========================================
export async function processSinglePlayStationGame(title: TitleThin, accountId: string, accessToken: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { coins: 0, plats: 0 }

    try {
        if (title.progress === 0) return { coins: 0, plats: 0 };

        const gameId = `psn-${title.npCommunicationId}`
        const npServiceName = title.npServiceName || 'trophy'
        const earned = title.earnedTrophies
        const defined = title.definedTrophies

        const unlockedCount = earned.bronze + earned.silver + earned.gold + earned.platinum
        const totalCount = defined.bronze + defined.silver + defined.gold + defined.platinum
        const isPlat = earned.platinum > 0

        console.log(`\n========================================================`)
        console.log(`🎮 [PSN] Jogo Resgatado: ${title.trophyTitleName} (${gameId})`);
        console.log(`   ↳ Progresso: ${unlockedCount}/${totalCount} (${title.progress}%) | Platinado: ${isPlat ? 'Sim 🏆' : 'Não'}`);

        await supabase.from('games').upsert({
            id: gameId,
            title: title.trophyTitleName,
            cover_url: title.trophyTitleIconUrl,
            banner_url: title.trophyTitleIconUrl,
            platform: 'PlayStation',
            total_achievements: totalCount
        }, { onConflict: 'id' })

        const { data: existingRecord } = await supabase.from('user_games').select('unlocked_achievements, is_platinum').eq('user_id', user.id).eq('game_id', gameId).maybeSingle()
        
        const previousUnlocked = existingRecord?.unlocked_achievements || 0
        const wasPlat = existingRecord?.is_platinum || false

        if (existingRecord) {
            await supabase.from('user_games').update({
                unlocked_achievements: unlockedCount, total_achievements: totalCount, is_platinum: isPlat
            }).eq('user_id', user.id).eq('game_id', gameId)
        } else {
            await supabase.from('user_games').insert({
                user_id: user.id, game_id: gameId, unlocked_achievements: unlockedCount, total_achievements: totalCount, is_platinum: isPlat
            })
        }

        let gameCoinsEarned = 0;
        let gamePlatsEarned = 0;

        if (unlockedCount > previousUnlocked) {
            console.log(`   ↳ 🧮 Executando Motor de Anti-Fraude e Cálculo de Raridade...`);
            
            try {
                const authorization = { accessToken } as AuthTokens;

                // 🔥 CORREÇÃO 2: Extrai a tipagem nativa da biblioteca sem usar 'any'! (Parameters<typeof Func>[0])
                type AuthParamTitle = Parameters<typeof getTitleTrophies>[0];
                const titleTrophiesData = await getTitleTrophies(authorization as unknown as AuthParamTitle, title.npCommunicationId, npServiceName);
                
                const defsMap = new Map();
                titleTrophiesData.trophies.forEach(t => defsMap.set(t.trophyId, t));

                type AuthParamUser = Parameters<typeof getUserTrophiesEarnedForTitle>[0];
                const earnedTrophiesData = await getUserTrophiesEarnedForTitle(authorization as unknown as AuthParamUser, accountId, title.npCommunicationId, npServiceName);
                
                const activitiesToInsert: {
                    user_id: string;
                    game_id: string;
                    game_name: string;
                    achievement_name: string;
                    achievement_icon: string;
                    rarity: string;
                    points_earned: number;
                    platform: string;
                    created_at: string;
                }[] = [];
                
                let expectedBaseCoins = 0;

                for (const earnedTrophy of earnedTrophiesData.trophies) {
                    if (earnedTrophy.earned) {
                        const def = defsMap.get(earnedTrophy.trophyId);
                        if (!def) continue;

                        let pts = 0;
                        const rarity = def.trophyType; // 'bronze', 'silver', 'gold', 'platinum'
                        
                        if (rarity === 'bronze') pts = 5;
                        else if (rarity === 'silver') pts = 10;
                        else if (rarity === 'gold') pts = 25;
                        else if (rarity === 'platinum') pts = 100;

                        expectedBaseCoins += pts;

                        activitiesToInsert.push({
                            user_id: user.id,
                            game_id: gameId,
                            game_name: title.trophyTitleName,
                            achievement_name: def.trophyName || 'Troféu Oculto',
                            achievement_icon: def.trophyIconUrl || title.trophyTitleIconUrl,
                            rarity: rarity,
                            points_earned: pts,
                            platform: 'PlayStation',
                            created_at: earnedTrophy.earnedDateTime || new Date().toISOString()
                        });
                    }
                }

                const { data: pastActivities } = await supabase.from('global_activity')
                    .select('points_earned, rarity, achievement_name')
                    .eq('user_id', user.id)
                    .eq('game_id', gameId);
                    
                let alreadyRegisteredCoins = 0;
                const pastSet = new Set(pastActivities?.map(a => a.achievement_name) || []);

                pastActivities?.forEach(act => {
                    alreadyRegisteredCoins += act.points_earned;
                });

                const coinsToAward = expectedBaseCoins - alreadyRegisteredCoins;
                
                console.log(`      • Valor total das conquistas: ${expectedBaseCoins}`);
                console.log(`      • Valor já pago no banco: ${alreadyRegisteredCoins}`);
                console.log(`      • Saldo a injetar agora: ${coinsToAward > 0 ? `+${coinsToAward}` : '0'}`);

                const newActivities = activitiesToInsert.filter(a => !pastSet.has(a.achievement_name));
                
                if (newActivities.length > 0) {
                    console.log(`   ↳ 🌐 Gravando metadados das conquistas novas (Nomes e Ícones)...`);
                    await supabase.from('global_activity').upsert(newActivities, { onConflict: 'user_id, game_id, achievement_name' });
                    console.log(`   ↳ 💾 Inseridas ${newActivities.length} novas conquistas na Timeline Global.`);
                    
                    newActivities.forEach(a => {
                        gameCoinsEarned += a.points_earned;
                        if (a.rarity === 'platinum') gamePlatsEarned += 1;
                    });
                }

            } catch (apiError) {
                console.error(`   ↳ ❌ Erro ao baixar detalhes dos troféus:`, apiError);
            }
        }

        if (isPlat && !wasPlat) {
            console.log(`   ↳ 🏆 NOVA PLATINA REGISTRADA! Conta atualizada.`);
        }
        
        if (gameCoinsEarned > 0) {
            console.log(`✅ [RESULTADO] 💰 Injetando: +${gameCoinsEarned} Nexus Coins | 🏆 Platinas: +${gamePlatsEarned}`);
        } else {
            console.log(`✅ [RESULTADO] ✔️ Banco Atualizado. Nenhum coin extra adicionado.`);
        }

        return { coins: gameCoinsEarned, plats: gamePlatsEarned }

    } catch (err) {
        console.error(`❌ [PSN] Erro Fatal no jogo ${title.trophyTitleName}:`, err)
        return { coins: 0, plats: 0 }
    }
}