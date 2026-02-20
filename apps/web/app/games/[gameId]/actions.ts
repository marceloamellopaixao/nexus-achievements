'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createGuide(gameId: string, title: string, content: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Tens de iniciar sessão para publicar um guia.' }
  if (!title.trim() || !content.trim()) return { error: 'O título e o conteúdo são obrigatórios.' }

  const { error } = await supabase.from('game_guides').insert({
    game_id: gameId,
    author_id: user.id,
    title: title.trim(),
    content: content.trim()
  })

  if (error) {
    console.error("Erro ao criar guia:", error)
    return { error: 'Ocorreu um erro ao publicar o teu guia.' }
  }

  revalidatePath(`/games/${gameId}`)
  return { success: true }
}

export async function uploadGuideImage(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Tens de iniciar sessão para enviar imagens.' }

  const file = formData.get('image') as File
  if (!file) return { error: 'Nenhuma imagem enviada.' }

  // Gera um nome único para a imagem
  const fileExt = file.name.split('.').pop()
  const fileName = `${user.id}-${Math.random().toString(36).substring(2)}.${fileExt}`

  try {
    // 1. CONVERSÃO SEGURA: Transforma o File nativo num Buffer que o Node.js/Supabase entende perfeitamente
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // 2. Envia o Buffer especificando o tipo exato da imagem
    const { error } = await supabase.storage.from('guides').upload(fileName, buffer, {
      contentType: file.type,
      upsert: false
    })

    if (error) {
      console.error("Erro no Supabase Storage:", error)
      return { error: 'O bucket não foi encontrado ou o acesso foi negado.' }
    }

    // Pega a URL pública
    const { data } = supabase.storage.from('guides').getPublicUrl(fileName)

    return { url: data.publicUrl }
  } catch (err) {
    console.error("Erro no processamento da imagem:", err)
    return { error: 'Falha ao processar o ficheiro de imagem.' }
  }
}

export async function toggleGuideVote(guideId: string, gameId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Tens de iniciar sessão para curtir.' }

  // 1. Verifica se já votou
  const { data: existing } = await supabase
    .from('guide_votes')
    .select('*')
    .eq('guide_id', guideId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    // Tira o voto
    await supabase.from('guide_votes').delete().eq('guide_id', guideId).eq('user_id', user.id)
  } else {
    // Dá o voto
    await supabase.from('guide_votes').insert({ guide_id: guideId, user_id: user.id })
  }

  // 2. Conta os votos totais reais
  const { count } = await supabase
    .from('guide_votes')
    .select('*', { count: 'exact', head: true })
    .eq('guide_id', guideId)

  // 3. Atualiza na tabela principal do guia
  const { error: updateError } = await supabase
    .from('game_guides')
    .update({ upvotes: count || 0 })
    .eq('id', guideId)

  if (updateError) console.error("Erro ao atualizar contador de votos:", updateError);

  // 4. Força o Next.js a limpar o cache da página toda, incluindo parâmetros da URL
  revalidatePath(`/games/${gameId}`, 'page')

  return { success: true, newCount: count || 0 }
}

export async function postGuideComment(guideId: string, gameId: string, content: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Tens de iniciar sessão para comentar.' }

  const { error } = await supabase.from('guide_comments').insert({
    guide_id: guideId,
    author_id: user.id,
    content: content.trim()
  })

  if (error) return { error: 'Erro ao publicar comentário.' }

  revalidatePath(`/games/${gameId}`)
  return { success: true }
}