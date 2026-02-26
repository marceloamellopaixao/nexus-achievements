'use server'

import { processQuestEvent } from '@/app/actions'
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

  await processQuestEvent('WRITE_GUIDE');

  revalidatePath(`/games/${gameId}`)
  return { success: true }
}

export async function uploadGuideImage(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Tens de iniciar sessão para enviar imagens.' }

  const file = formData.get('image') as File
  if (!file) return { error: 'Nenhuma imagem enviada.' }

  const fileExt = file.name.split('.').pop()
  const fileName = `${user.id}-${Math.random().toString(36).substring(2)}.${fileExt}`

  try {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error } = await supabase.storage.from('guides').upload(fileName, buffer, {
      contentType: file.type,
      upsert: false
    })

    if (error) {
      console.error("Erro no Supabase Storage:", error)
      return { error: 'O bucket não foi encontrado ou o acesso foi negado.' }
    }

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

  const { data: existing } = await supabase
    .from('guide_votes')
    .select('*')
    .eq('guide_id', guideId)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    await supabase.from('guide_votes').delete().eq('guide_id', guideId).eq('user_id', user.id)
  } else {
    await supabase.from('guide_votes').insert({ guide_id: guideId, user_id: user.id })
  }

  const { count } = await supabase.from('guide_votes').select('*', { count: 'exact', head: true }).eq('guide_id', guideId)

  await supabase.from('game_guides').update({ upvotes: count || 0 }).eq('id', guideId)

  await processQuestEvent('LIKE_GUIDE');
  
  revalidatePath(`/games/${gameId}`)
  return { success: true, newCount: count || 0, isVoted: !existing }
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

export async function deleteGuide(guideId: string, gameId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Não autorizado.' }

  // Tenta apagar o guia no banco de dados e retorna o conteúdo que foi apagado
  const { data, error } = await supabase
    .from('game_guides')
    .delete()
    .eq('id', guideId)
    .eq('author_id', user.id)
    .select()

  if (error) {
    console.error("Erro ao apagar guia:", error.message)
    return { error: 'Falha no banco de dados. Verifica o SQL de CASCADE.' }
  }

  if (!data || data.length === 0) {
    return { error: 'Sem permissão para apagar este guia no banco de dados.' }
  }

  const deletedGuide = data[0]
  const regex = /!\[.*?\]\((.*?)\)/g
  let match
  const filesToDelete: string[] = []

  while ((match = regex.exec(deletedGuide.content)) !== null) {
    const url = match[1]
    
    if (url) {
      const urlParts = url.split('/guides/')
      if (urlParts.length > 1 && urlParts[1]) {
        const fileName = urlParts[1].split('?')[0]
        
        if (fileName) {
          filesToDelete.push(fileName)
        }
      }
    }
  }

  if (filesToDelete.length > 0) {
    await supabase.storage.from('guides').remove(filesToDelete)
  }

  revalidatePath(`/games/${gameId}`, 'page')
  return { success: true }
}

export async function uploadGameCustomization(gameId: string, type: 'banner' | 'cover', formData: FormData | null, imageUrl: string | null = null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Acesso negado.' }

  // Garante que só o admin pode alterar imagens de jogos
  const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (userData?.role !== 'admin') return { error: 'Apenas administradores podem atualizar as capas oficiais.' }

  let finalUrl = imageUrl;

  // Se não foi enviado um link direto, processamos o ficheiro físico
  if (!finalUrl && formData) {
    const file = formData.get('image') as File
    if (!file) return { error: 'Nenhuma imagem fornecida.' }

    const fileExt = file.name.split('.').pop()
    const fileName = `${gameId}-${type}-${Math.random().toString(36).substring(2)}.${fileExt}`

    try {
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      const { error: uploadError } = await supabase.storage.from('game_assets').upload(fileName, buffer, {
        contentType: file.type,
        upsert: false
      })

      if (uploadError) return { error: 'Falha ao fazer upload da imagem no Storage.' }

      const { data: publicData } = supabase.storage.from('game_assets').getPublicUrl(fileName)
      finalUrl = publicData.publicUrl
    } catch (err) {
      console.error("Erro no processamento:", err)
      return { error: 'Erro inesperado ao processar arquivo.' }
    }
  }

  // Abortamos se por algum motivo não houver URL
  if (!finalUrl) return { error: 'Nenhuma imagem ou link válido fornecido.' }

  // 🧹 LIMPEZA: Buscar a URL antiga para apagar se for do nosso Storage
  const { data: gameData } = await supabase.from('games').select('banner_url, cover_url').eq('id', gameId).single()
  const oldUrl = type === 'banner' ? gameData?.banner_url : gameData?.cover_url

  // Verifica se a imagem antiga estava no nosso bucket 'game_assets'
  if (oldUrl && oldUrl.includes('/game_assets/')) {
    const oldFileName = oldUrl.split('/game_assets/').pop()?.split('?')[0]
    if (oldFileName) {
      await supabase.storage.from('game_assets').remove([oldFileName])
    }
  }

  // Atualiza diretamente na tabela global de games
  const updateData = type === 'banner' ? { banner_url: finalUrl } : { cover_url: finalUrl }
  const { error } = await supabase.from('games').update(updateData).eq('id', gameId)

  if (error) return { error: 'Erro ao salvar a arte no banco de dados.' }

  revalidatePath(`/games/${gameId}`)
  return { success: 'Artes oficiais do jogo atualizadas com sucesso!' }
}