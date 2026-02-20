'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// Função 1: Salvar a Steam ID no perfil do usuário
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

// Função 2: O Oráculo (Motor de Sincronização Básico)
export async function syncSteamAchievements() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Não autorizado.' }

  // 1. Busca a Steam ID do usuário
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

    const games = gamesData.response.games
    let newCoins = userData.nexus_coins || 0
    let platinums = userData.total_platinums || 0
    let syncedGamesCount = games.length

    // Lógica simplificada de MVP: Como a API de conquistas individuais da Steam
    // exige 1 requisição POR JOGO (o que causaria timeout), no MVP vamos 
    // recompensar o usuário pelos jogos que ele possui.
    // (Numa infraestrutura real, usaríamos um Worker em background para processar jogo a jogo).
    
    // Bônus simbólico de primeira sincronização:
    newCoins += 500; 

    // Atualiza os status principais do usuário
    await supabase
      .from('users')
      .update({
        nexus_coins: newCoins,
        total_games: syncedGamesCount,
        global_level: Math.floor(newCoins / 1000) + 1 // Regra simples de nível
      })
      .eq('id', user.id)

    // Insere um log genérico de atividade para testarmos o Feed
    await supabase
      .from('global_activity')
      .insert({
        user_id: user.id,
        game_name: 'Conta Steam',
        achievement_name: 'Sincronização Inicial Concluída',
        points_earned: 500,
        platform: 'Steam'
      })

    revalidatePath('/integrations')
    revalidatePath('/dashboard')
    revalidatePath('/profile')

    return { success: `Sincronização concluída! ${syncedGamesCount} jogos encontrados. Você ganhou 500 Nexus Coins.` }

  } catch (err) {
    console.error(err)
    return { error: 'Falha ao conectar com a API da Steam.' }
  }
}