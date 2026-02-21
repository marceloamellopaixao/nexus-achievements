'use server'

import { createClient } from '@/utils/supabase/server'

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