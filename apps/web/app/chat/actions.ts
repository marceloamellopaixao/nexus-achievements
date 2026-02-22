'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function sendMessage(content: string, channel: string = 'global') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Inicia sessão para falar no chat.' }
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

  // 2. Atualiza e pede ao banco para devolver o que foi alterado (.select())
  const { data } = await supabase.from('chat_messages')
    .update({ is_read: true })
    .eq('channel', channel)
    .neq('user_id', user.id)
    .eq('is_read', false)
    .select('id')

  // 3. Se realmente atualizou alguma mensagem, forçamos o layout a recarregar as bolinhas
  if (data && data.length > 0) {
    revalidatePath('/chat', 'layout')
    revalidatePath('/', 'layout') 
  }
}