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

export interface TitleThin {
    npCommunicationId: string;
    npServiceName: "trophy" | "trophy2" | string; 
    trophyTitleName: string;
    trophyTitleIconUrl: string;
    progress: number;
    earnedTrophies: { bronze: number; silver: number; gold: number; platinum: number };
    definedTrophies: { bronze: number; silver: number; gold: number; platinum: number };
}

interface AuthTokens {
    accessToken: string;
    expiresIn?: number;
    idToken?: string;
    refreshToken?: string;
}

interface PsnTrophyDef {
    trophyId: number;
    trophyType: string;
    trophyName?: string;
    trophyIconUrl?: string;
}

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
        console.log(`\n========================================================`)
        console.log(`📡 [PSN NEXUS-SYNC] INICIANDO VARREDURA: ${platformUserId}`)
        console.log(`========================================================\n`)

        const accessCode = await exchangeNpssoForAccessCode(npsso)
        const authorization = await exchangeAccessCodeForAuthTokens(accessCode)
        let accountId = null;

        try {
            console.log(`   ↳ 🌐 Buscando Nickname na PSN (Modo Direto)...`);
            const profileResponse = await getProfileFromUserName(authorization, platformUserId);
            if (profileResponse?.profile?.accountId) {
                accountId = profileResponse.profile.accountId;
                console.log(`   ↳ ✅ Nickname resgatado: ${platformUserId}`);
            }
        } catch (error) {
            console.warn(`   ↳ ⚠️ Busca direta falhou. Tentando rede...`, error instanceof Error ? error.message : '');
        }

        if (!accountId) {
            console.log(`   ↳ 🌐 Buscando Nickname na PSN (Modo Universal)...`);
            const searchResult = await makeUniversalSearch(authorization, platformUserId, 'SocialAllAccounts')
            const resultsArray = searchResult.domainResponses[0]?.results || []
            const targetMatch = resultsArray.find(
                (r: { socialMetadata?: { onlineId?: string } }) => r.socialMetadata?.onlineId?.toLowerCase() === platformUserId.toLowerCase()
            )
            if (targetMatch?.socialMetadata?.accountId) {
                accountId = targetMatch.socialMetadata.accountId;
                console.log(`   ↳ ✅ Nickname resgatado: ${platformUserId}`);
            }
        }

        if (!accountId) {
            console.error(`❌ [PSN] Erro: Conta "${platformUserId}" não encontrada na PSN ou totalmente privada.`);
            return { error: 'Conta PSN não encontrada ou perfil privado.' }
        }

        console.log(`   ↳ ✅ Alvo Confirmado! AccountID: ${accountId}\n`)

        const allTrophyTitles: TitleThin[] = [];
        let currentOffset = 0;
        const limitPerPage = 250;
        
        console.log(`   ↳ 📚 Puxando Biblioteca de Jogos da PSN (Todas as páginas)...`);
        
        while (true) {
            const response = await getUserTitles(authorization, accountId, { limit: limitPerPage, offset: currentOffset })
            const titles = (response.trophyTitles || []) as unknown as TitleThin[];
            allTrophyTitles.push(...titles);
            if (titles.length < limitPerPage) break;
            currentOffset += limitPerPage;
        }

        if (allTrophyTitles.length === 0) {
            console.warn(`   ↳ ⚠️ Nenhum jogo público encontrado no perfil.`);
            return { error: 'Nenhum jogo público encontrado no perfil.' }
        }

        console.log(`   ↳ ✅ Encontrados ${allTrophyTitles.length} jogos!\n`);
        
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

export async function processSinglePlayStationGame(title: TitleThin, accountId: string, accessToken: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { coins: 0, plats: 0 }

    try {
        if (title.progress === 0) return { coins: 0, plats: 0 };

        const gameId = `psn-${title.npCommunicationId}`
        const npServiceName: "trophy" | "trophy2" = title.npServiceName === 'trophy2' ? 'trophy2' : 'trophy';
        const earned = title.earnedTrophies
        const defined = title.definedTrophies

        const unlockedCount = earned.bronze + earned.silver + earned.gold + earned.platinum
        const totalCount = defined.bronze + defined.silver + defined.gold + defined.platinum
        const isPlat = earned.platinum > 0

        console.log(`\n========================================================`)
        console.log(`🎮 [PSN] Jogo Resgatado: ${title.trophyTitleName} (${gameId})`);
        console.log(`   ↳ Progresso: ${unlockedCount}/${totalCount} (${title.progress}%) | Platinado: ${isPlat ? 'Sim 🏆' : 'Não'}`);

        console.log(`   ↳ 🔍 Verificando e preservando Cache de Imagens do Nexus...`);
        
        // 🔥 CORREÇÃO 1: Preservamos as capas e banners customizados!
        const { data: existingGameData } = await supabase.from('games').select('cover_url, banner_url, categories').eq('id', gameId).maybeSingle();
        const finalCover = existingGameData?.cover_url || title.trophyTitleIconUrl;
        const finalBanner = existingGameData?.banner_url || title.trophyTitleIconUrl;

        await supabase.from('games').upsert({
            id: gameId,
            title: title.trophyTitleName,
            cover_url: finalCover,
            banner_url: finalBanner,
            platform: 'PlayStation',
            total_achievements: totalCount,
            categories: existingGameData?.categories || []
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

        const { data: pastActivities } = await supabase.from('global_activity')
            .select('points_earned, rarity, achievement_name')
            .eq('user_id', user.id)
            .eq('game_id', gameId);
            
        let alreadyRegisteredCoins = 0;
        let individualTrophiesSaved = 0;
        const pastSet = new Set(pastActivities?.map(a => a.achievement_name) || []);

        pastActivities?.forEach(act => {
            if (act.rarity !== 'platinum') {
                alreadyRegisteredCoins += act.points_earned;
            }
            // Verifica quantos troféus REAIS (com nome) estão na base, ignorando a Platina e os pacotes genéricos
            if (act.rarity !== 'platinum' && !act.achievement_name.startsWith('Pacote de Troféus PSN')) {
                individualTrophiesSaved += 1;
            }
        });

        const expectedBaseCoins = (earned.bronze * 5) + (earned.silver * 10) + (earned.gold * 25);
        const coinsToAward = expectedBaseCoins - alreadyRegisteredCoins;
        
        // 🔥 A MÁGICA DA AUTO-CURA: Conta se faltam troféus visuais na timeline (descontando a platina)
        const expectedIndividualTrophies = unlockedCount - (isPlat ? 1 : 0);
        const isMissingVisualTrophies = individualTrophiesSaved < expectedIndividualTrophies;

        console.log(`   ↳ 🧮 Executando Motor de Anti-Fraude e Cálculo de Raridade...`);
        console.log(`      • Valor base já pago no banco: ${alreadyRegisteredCoins} / Total devido: ${expectedBaseCoins}`);
        console.log(`      • Troféus REAIS na timeline: ${individualTrophiesSaved} / Total devido: ${expectedIndividualTrophies}`);

        if (coinsToAward > 0 || unlockedCount > previousUnlocked || isMissingVisualTrophies) {
            
            let usedFallback = false;

            try {
                const authorization = { accessToken } as AuthTokens;
                type AuthParamTitle = Parameters<typeof getTitleTrophies>[0];
                
                const titleTrophiesData = await getTitleTrophies(authorization as unknown as AuthParamTitle, title.npCommunicationId, 'all', { npServiceName });
                const availableTrophies = titleTrophiesData?.trophies || [];
                const defsMap = new Map();
                
                availableTrophies.forEach((t: PsnTrophyDef) => defsMap.set(t.trophyId, t));

                type AuthParamUser = Parameters<typeof getUserTrophiesEarnedForTitle>[0];
                const earnedTrophiesData = await getUserTrophiesEarnedForTitle(authorization as unknown as AuthParamUser, accountId, title.npCommunicationId, 'all', { npServiceName });
                const earnedTrophiesList = earnedTrophiesData?.trophies || [];
                
                const activitiesToInsert: { user_id: string; game_id: string; game_name: string; achievement_name: string; achievement_icon: string; rarity: string; points_earned: number; platform: string; created_at: string; }[] = [];

                for (const earnedTrophy of earnedTrophiesList) {
                    if (earnedTrophy.earned) {
                        const def = defsMap.get(earnedTrophy.trophyId);
                        if (!def) continue;

                        let pts = 0;
                        const rarity = def.trophyType; 
                        if (rarity === 'bronze') pts = 5;
                        else if (rarity === 'silver') pts = 10;
                        else if (rarity === 'gold') pts = 25;
                        else if (rarity === 'platinum') pts = 100;

                        activitiesToInsert.push({
                            user_id: user.id, game_id: gameId, game_name: title.trophyTitleName,
                            achievement_name: def.trophyName || 'Troféu Oculto',
                            achievement_icon: def.trophyIconUrl || title.trophyTitleIconUrl,
                            rarity: rarity, points_earned: pts, platform: 'PlayStation',
                            created_at: earnedTrophy.earnedDateTime || new Date().toISOString()
                        });
                    }
                }

                const newActivities = activitiesToInsert.filter(a => !pastSet.has(a.achievement_name));
                
                if (newActivities.length > 0) {
                    console.log(`   ↳ 🌐 Gravando metadados das conquistas novas (Nomes e Ícones)...`);
                    
                    // 🔥 SE ESTAMOS A CURAR A TIMELINE, APAGAMOS O PACOTE GENÉRICO FALSO!
                    if (isMissingVisualTrophies) {
                        await supabase.from('global_activity').delete()
                            .eq('user_id', user.id).eq('game_id', gameId).like('achievement_name', 'Pacote de Troféus PSN%');
                        console.log(`   ↳ 🧹 [CURA] Pacote genérico deletado! Substituindo pelos troféus reais...`);
                    }

                    await supabase.from('global_activity').upsert(newActivities, { onConflict: 'user_id, game_id, achievement_name' });
                    console.log(`   ↳ 💾 Inseridas ${newActivities.length} novas conquistas na Timeline Global.`);
                } else if (coinsToAward > 0) {
                    usedFallback = true;
                }

            } catch (apiError) {
                console.warn(`   ↳ ⚠️ A Sony limitou ou falhou na entrega dos troféus individuais:`, apiError instanceof Error ? apiError.message : '');
                usedFallback = true;
            }

            // O PLANO B DO NEXUS
            if (usedFallback && coinsToAward > 0) {
                console.log(`   ↳ 🛡️ Ativando Fallback do Nexus: Injetando pacote genérico para não perder as moedas!`);
                await supabase.from('global_activity').insert({
                    user_id: user.id, game_id: gameId, game_name: title.trophyTitleName,
                    achievement_name: `Pacote de Troféus PSN (+${unlockedCount - previousUnlocked} Troféus)`,
                    achievement_icon: title.trophyTitleIconUrl, rarity: 'silver', points_earned: coinsToAward, platform: 'PlayStation'
                });
            }

            // Apenas adicionamos ao saldo financeiro o que era efetivamente "Devido"
            if (coinsToAward > 0) {
                gameCoinsEarned += coinsToAward;
            }
        }

        // Tratamento da Platina
        if (isPlat && !wasPlat && !pastSet.has('🏆 PLATINA CONQUISTADA!')) {
            console.log(`   ↳ 🏆 NOVA PLATINA REGISTRADA! Conta atualizada.`);
            gamePlatsEarned += 1;
            gameCoinsEarned += 100;
            
            await supabase.from('global_activity').upsert({
                user_id: user.id, game_id: gameId, game_name: title.trophyTitleName, achievement_name: '🏆 PLATINA CONQUISTADA!',
                achievement_icon: 'platinum_ps5', rarity: 'platinum', points_earned: 100, platform: 'PlayStation',
                created_at: new Date().toISOString()
            }, { onConflict: 'user_id, game_id, achievement_name' })
        }
        
        if (gameCoinsEarned > 0 || gamePlatsEarned > 0) {
            console.log(`✅ [RESULTADO] 💰 Injetando: +${gameCoinsEarned} Nexus Coins | 🏆 Platinas: +${gamePlatsEarned}`);
        } else {
            console.log(`✅ [RESULTADO] ✔️ Banco e Timeline Atualizados.`);
        }

        return { coins: gameCoinsEarned, plats: gamePlatsEarned }

    } catch (err) {
        console.error(`❌ [PSN] Erro Fatal no jogo ${title.trophyTitleName}:`, err)
        return { coins: 0, plats: 0 }
    }
}