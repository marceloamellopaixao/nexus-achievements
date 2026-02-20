'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateProfile(username: string, bio: string) {
  if (!username || username.trim() === '') {
    return { error: 'O nome de usuário não pode ficar vazio.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Usuário não autenticado.' }

  const { error } = await supabase
    .from('users')
    .update({ 
      username: username.trim(), 
      bio: bio.trim() 
    })
    .eq('id', user.id)

  if (error) {
    console.error(error)
    return { error: 'Erro ao atualizar o perfil. Tente novamente.' }
  }

  // Revalida a página do perfil e o layout global (Topbar)
  revalidatePath(`/profile/${username.trim()}`)
  revalidatePath('/')
  
  return { success: true, message: 'Perfil salvo com sucesso!' }
}