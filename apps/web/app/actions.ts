'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

type ActionType = 'SEND_CHAT' | 'LIKE_GUIDE' | 'WRITE_GUIDE' | 'FOLLOW_USER' | 'LOGIN'

// 1. Processa a ação invisivelmente no background (Corrigido ESLint)
export async function processQuestEvent(actionType: ActionType, amount: number = 1) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const now = new Date()
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString()
  
  const endOfWeek = new Date(now);
  endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
  endOfWeek.setHours(23, 59, 59, 999);
  const endOfWeekStr = endOfWeek.toISOString();

  const { data: activeQuests } = await supabase.from('nexus_quests').select('*').eq('action_type', actionType)
  if (!activeQuests || activeQuests.length === 0) return null;

  // ESLint Fix: Usando 'const' porque estamos apenas a fazer .push() no array, a referência não muda
  const completedQuests: { title: string, reward: number }[] = [];

  for (const quest of activeQuests) {
    let expiration = null;
    if (quest.quest_type === 'DAILY') expiration = endOfDay;
    else if (quest.quest_type === 'WEEKLY') expiration = endOfWeekStr;

    let query = supabase.from('user_quest_progress').select('*').eq('user_id', user.id).eq('quest_id', quest.id)
    if (expiration) query = query.eq('expires_at', expiration)
    else query = query.is('expires_at', null)

    const { data: existingProgress } = await query.maybeSingle()

    if (existingProgress?.is_completed) continue;

    const currentCount = (existingProgress?.current_progress || 0) + amount;
    const isNowComplete = currentCount >= quest.target_amount;

    // ESLint Fix: Variável não utilizada removida
    await supabase.from('user_quest_progress').upsert({
        id: existingProgress?.id,
        user_id: user.id,
        quest_id: quest.id,
        current_progress: currentCount,
        is_completed: isNowComplete,
        completed_at: isNowComplete ? new Date().toISOString() : null,
        expires_at: expiration
      }, { onConflict: 'user_id, quest_id, expires_at' })

    if (isNowComplete && (!existingProgress || !existingProgress.is_completed)) {
      completedQuests.push({ title: quest.title, reward: quest.reward_coins });
    }
  }

  return completedQuests; 
}

// 2. Busca todas as quests atuais para exibir no Modal
export async function getUserQuests() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  // Busca todas as quests globais
  const { data: quests } = await supabase.from('nexus_quests').select('*').order('created_at', { ascending: true })
  
  // Busca o progresso atual do utilizador
  const { data: progress } = await supabase.from('user_quest_progress').select('*').eq('user_id', user.id)

  if (!quests) return { quests: [] }

  // Mescla os dados
  const mergedQuests = quests.map(quest => {
    // Para simplificar a lógica, pegamos o progresso mais recente que ainda não expirou
    const userProg = progress?.find(p => p.quest_id === quest.id && (!p.expires_at || new Date(p.expires_at) > new Date()));
    return {
      ...quest,
      progress: userProg?.current_progress || 0,
      is_completed: userProg?.is_completed || false,
      is_claimed: userProg?.is_claimed || false,
      progress_id: userProg?.id || null
    }
  })

  return { quests: mergedQuests }
}

// 3. Resgatar a recompensa (Dar Moedas) e atualizar UI
export async function claimQuestReward(progressId: string, rewardCoins: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado' }

  // 1. Marca como resgatado
  const { error } = await supabase.from('user_quest_progress').update({ is_claimed: true }).eq('id', progressId).eq('user_id', user.id)
  if (error) return { error: 'Falha ao resgatar.' }

  // 2. Dá as moedas ao utilizador
  const { data: userData } = await supabase.from('users').select('coins').eq('id', user.id).single()
  const newBalance = (userData?.coins || 0) + rewardCoins;
  await supabase.from('users').update({ coins: newBalance }).eq('id', user.id)

  // ESLint Fix: Atualiza a interface (Header/Moedas) instantaneamente em todos os layouts
  revalidatePath('/', 'layout')
  
  return { success: true, newBalance }
}

// ==========================================
// SISTEMA DE RICH PRESENCE (STATUS IN-GAME)
// ==========================================
export async function fetchCurrentPlayingGame() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Busca a Steam ID vinculada ao usuário
  const { data: userData } = await supabase.from('users').select('steam_id').eq('id', user.id).single()
  if (!userData?.steam_id) return null

  const STEAM_KEY = process.env.STEAM_API_KEY
  try {
    // Ping na API de Resumo de Jogador da Steam (Não faz cache para termos tempo real)
    const res = await fetch(`http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAM_KEY}&steamids=${userData.steam_id}`, { cache: 'no-store' })
    const data = await res.json()
    const player = data?.response?.players?.[0]

    // A Steam só retorna "gameextrainfo" se o usuário estiver com um jogo aberto AGORA!
    if (player && player.gameextrainfo) {
      return {
        title: player.gameextrainfo,
        appId: player.gameid,
        platform: 'Steam',
        image_url: player.gameid ? `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${player.gameid}/capsule_231x87.jpg` : null
      }
    }
    return null
  } catch (err) {
    console.error("Erro ao buscar Rich Presence:", err)
    return null
  }
}