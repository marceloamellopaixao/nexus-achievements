'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function uploadGameCustomization(gameId: string, type: 'banner' | 'cover', formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Acesso negado.' }

  const file = formData.get('image') as File
  if (!file) return { error: 'Nenhuma imagem fornecida.' }

  // 1. Verifica se o usuário é admin
  const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single()
  const isAdmin = userData?.role === 'admin'

  // 2. Upload da Imagem
  const fileExt = file.name.split('.').pop()
  const fileName = `${gameId}-${type}-${user.id}-${Math.random().toString(36).substring(2)}.${fileExt}`

  try {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Nota: Certifique-se de que o bucket 'game_assets' existe e é público no seu Supabase
    const { error: uploadError } = await supabase.storage.from('game_assets').upload(fileName, buffer, {
      contentType: file.type,
      upsert: false
    })

    if (uploadError) return { error: 'Falha ao fazer upload da imagem.' }

    const { data: publicData } = supabase.storage.from('game_assets').getPublicUrl(fileName)
    const publicUrl = publicData.publicUrl

    // 3. Atualizar o Banco de Dados
    if (isAdmin) {
      // Modifica Globalmente
      const updateData = type === 'banner' ? { banner_url: publicUrl } : { cover_url: publicUrl }
      await supabase.from('games').update(updateData).eq('id', gameId)
    } else {
      // Modifica Apenas para o Usuário
      const updateData = type === 'banner' ? { custom_banner_url: publicUrl } : { custom_cover_url: publicUrl }
      await supabase.from('user_game_customization').upsert({
        user_id: user.id,
        game_id: gameId,
        ...updateData
      }, { onConflict: 'user_id, game_id' })
    }

    revalidatePath(`/games/${gameId}`)
    return { success: 'Imagem atualizada com sucesso!' }
  } catch (err) {
    console.error("Erro no processamento:", err)
    return { error: 'Erro inesperado.' }
  }
}