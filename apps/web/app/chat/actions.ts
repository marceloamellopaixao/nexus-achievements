'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { processQuestEvent } from '../actions'

export async function sendMessage(content: string, channel: string = 'global') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Inicie a sessão para falar no chat.' }
  if (!content.trim()) return { error: 'Mensagem vazia.' }

  const { error } = await supabase.from('chat_messages').insert({
    user_id: user.id,
    content: content.trim(),
    channel
  })

  await processQuestEvent('SEND_CHAT');

  if (error) return { error: 'Falha ao enviar mensagem.' }
  return { success: true }
}

export async function markChannelAsRead(channel: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  if (channel === 'global') {
    await supabase.from('users').update({ last_global_read: new Date().toISOString() }).eq('id', user.id)
    revalidatePath('/chat', 'layout')
    return
  }

  const { data } = await supabase.from('chat_messages')
    .update({ is_read: true }).eq('channel', channel).neq('user_id', user.id).eq('is_read', false).select('id')

  if (data && data.length > 0) {
    revalidatePath('/chat', 'layout')
    revalidatePath('/', 'layout')
  }
}

export async function toggleChatFollow(targetId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  await supabase.from('user_follows').insert({ follower_id: user.id, following_id: targetId })
  revalidatePath('/chat', 'layout')
  return { success: true }
}

// 🔥 LIMPEZA INTELIGENTE DE CHAT (Admin vs User)
export async function clearChatMessages(channelId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  if (channelId === 'global') {
    // Verifica se é Admin
    const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single()
    
    if (userData?.role === 'admin') {
      // ADMIN: Apaga tudo do global
      await supabase.from('chat_messages').delete().eq('channel', 'global')
    } else {
      // USER: Apaga só as próprias mensagens no global
      await supabase.from('chat_messages').delete().eq('channel', 'global').eq('user_id', user.id)
    }
  } else {
    // CHAT PRIVADO: Apaga o histórico inteiro do canal para ambos
    await supabase.from('chat_messages').delete().eq('channel', channelId)
  }
  
  revalidatePath('/chat', 'layout')
  return { success: true }
}

export async function deleteSingleMessage(messageId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  await supabase.from('chat_messages').delete().eq('id', messageId).eq('user_id', user.id)
  return { success: true }
}

// 🛡️ SUBMETER DENÚNCIA PARA O BANCO DE DADOS
export async function submitUserReport(reportedUsername: string, reason: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const { error } = await supabase.from('user_reports').insert({
    reporter_id: user.id,
    reported_username: reportedUsername,
    reason: reason
  })

  if (error) return { error: 'Falha ao enviar denúncia.' }
  return { success: 'Denúncia enviada à administração do Nexus.' }
}

export async function getChatPreferences(channelId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { is_muted: false, is_archived: false }

  const { data } = await supabase.from('user_chat_preferences').select('is_muted, is_archived').eq('user_id', user.id).eq('channel_id', channelId).maybeSingle()
  return data || { is_muted: false, is_archived: false }
}

export async function toggleChatPreference(channelId: string, type: 'mute' | 'archive', currentValue: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const updateData = type === 'mute' ? { is_muted: !currentValue } : { is_archived: !currentValue };
  const { error } = await supabase.from('user_chat_preferences').upsert({ user_id: user.id, channel_id: channelId, ...updateData }, { onConflict: 'user_id, channel_id' })

  if (error) return { error: 'Falha ao atualizar preferência.' }
  revalidatePath('/chat', 'layout')
  return { success: true, newValue: !currentValue }
}