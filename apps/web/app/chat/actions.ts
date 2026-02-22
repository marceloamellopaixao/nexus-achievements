'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

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

  if (error) {
    console.error("Erro no chat:", error)
    return { error: 'Falha ao enviar mensagem.' }
  }

  return { success: true }
}

export async function markChannelAsRead(channel: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  // SE FOR O CHAT GLOBAL: Atualiza o horário de última leitura na tabela users
  if (channel === 'global') {
    await supabase.from('users').update({ last_global_read: new Date().toISOString() }).eq('id', user.id)
    revalidatePath('/chat', 'layout')
    return
  }

  // SE FOR UM CHAT PRIVADO: Marca as mensagens individuais como lidas
  const { data } = await supabase.from('chat_messages')
    .update({ is_read: true })
    .eq('channel', channel)
    .neq('user_id', user.id)
    .eq('is_read', false)
    .select('id')

  if (data && data.length > 0) {
    revalidatePath('/chat', 'layout')
    revalidatePath('/', 'layout')
  }
}