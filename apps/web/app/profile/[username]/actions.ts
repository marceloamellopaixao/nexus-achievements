'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function toggleFollow(targetUserId: string, currentPath: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return { error: 'Tens de ter sessão iniciada para seguir caçadores.' }
  if (user.id === targetUserId) return { error: 'Não podes seguir-te a ti próprio.' }

  const { data: existing } = await supabase
    .from('user_follows')
    .select('follower_id')
    .eq('follower_id', user.id)
    .eq('following_id', targetUserId)
    .maybeSingle()

  let isNowFollowing = false;

  if (existing) {
    // CAPTURA DE ERRO NO DELETE
    const { error } = await supabase.from('user_follows').delete().eq('follower_id', user.id).eq('following_id', targetUserId)
    if (error) {
      console.error("Erro ao deixar de seguir:", error.message)
      return { error: 'Falha no banco de dados ao tentar deixar de seguir.' }
    }
    isNowFollowing = false;
  } else {
    // CAPTURA DE ERRO NO INSERT
    const { error } = await supabase.from('user_follows').insert({ follower_id: user.id, following_id: targetUserId })
    if (error) {
      console.error("Erro ao seguir:", error.message)
      return { error: `Erro do banco: ${error.message}` } // Vai mostrar o erro real no Toast!
    }
    isNowFollowing = true;
  }

  // Usar 'layout' limpa o cache de forma mais agressiva para atualizar os números
  revalidatePath(currentPath, 'layout')
  
  return { success: true, isNowFollowing }
}

export async function postComment(profileUserId: string, content: string, currentPath: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Tens de ter sessão iniciada para comentar.' }
  if (!content.trim()) return { error: 'O recado não pode estar vazio.' }

  const { error } = await supabase.from('profile_comments').insert({
    profile_id: profileUserId,
    author_id: user.id,
    content: content.trim()
  })

  if (error) return { error: 'Erro ao enviar recado. Tenta novamente.' }

  revalidatePath(currentPath)
  return { success: true }
}

export async function deleteComment(commentId: string, currentPath: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  // Apenas o autor do comentário OU o dono do perfil podem apagar o recado
  const { data: comment } = await supabase.from('profile_comments').select('author_id, profile_id').eq('id', commentId).single()

  if (!comment) return { error: 'Comentário não encontrado.' }
  if (comment.author_id !== user.id && comment.profile_id !== user.id) {
    return { error: 'Sem permissão para apagar este recado.' }
  }

  await supabase.from('profile_comments').delete().eq('id', commentId)
  revalidatePath(currentPath)
  return { success: true }
}