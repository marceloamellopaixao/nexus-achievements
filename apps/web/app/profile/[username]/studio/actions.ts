'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// ==========================================
// UPLOAD DE AVATAR E BANNER COM LIMPEZA DE IMAGENS ANTIGAS
// ==========================================
export async function uploadProfileImage(formData: FormData, type: 'avatar' | 'banner') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const file = formData.get('image') as File
  if (!file) return { error: 'Nenhuma imagem fornecida.' }

  const fileExt = file.name.split('.').pop()
  const fileName = `${user.id}-${type}-${Math.random().toString(36).substring(2)}.${fileExt}`

  try {
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, buffer, {
      contentType: file.type,
      upsert: false
    })

    if (uploadError) return { error: 'Falha ao fazer upload da imagem.' }

    const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(fileName)
    const publicUrl = publicData.publicUrl

    // 🧹 LIMPEZA: Buscar a URL antiga para apagar se for do nosso Storage
    const { data: userData } = await supabase.from('users').select('username, avatar_url, profile_banner_url').eq('id', user.id).single()
    const oldUrl = type === 'avatar' ? userData?.avatar_url : userData?.profile_banner_url

    // Verifica se a imagem antiga estava no nosso bucket 'avatars'
    if (oldUrl && oldUrl.includes('/avatars/')) {
      const oldFileName = oldUrl.split('/avatars/').pop()?.split('?')[0]
      if (oldFileName) {
        await supabase.storage.from('avatars').remove([oldFileName])
      }
    }

    // Salva na tabela users
    const updateData = type === 'avatar' ? { avatar_url: publicUrl } : { profile_banner_url: publicUrl }
    await supabase.from('users').update(updateData).eq('id', user.id)

    revalidatePath(`/profile/${userData?.username}`)
    revalidatePath(`/profile/${userData?.username}/studio`)

    return { success: 'Imagem atualizada com sucesso!', url: publicUrl }
  } catch (err) {
    console.error(err)
    return { error: 'Erro inesperado ao processar a imagem.' }
  }
}

// ==========================================
// ATUALIZAR TEXTOS (NOME E BIO)
// ==========================================
export async function updateProfile(username: string, bio: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  // Verifica se o username já está em uso por outra pessoa
  const { data: existing } = await supabase.from('users').select('id').eq('username', username).neq('id', user.id).maybeSingle()
  if (existing) return { error: 'Este Gamer Tag já está em uso.' }

  const { error } = await supabase.from('users').update({ username, bio }).eq('id', user.id)
  if (error) return { error: 'Falha ao guardar perfil.' }

  revalidatePath(`/profile/${username}`)
  return { success: true, message: 'Perfil atualizado com sucesso!' }
}

// ==========================================
// COSMÉTICOS E ESTANTE (MANTIDOS)
// ==========================================
export async function equipCosmetic(itemId: string, category: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Não autorizado' }

  // Verifica se o utilizador possui o item ou se está a desequipar ('none')
  if (itemId !== 'none') {
    const { data: ownsItem } = await supabase
      .from('user_inventory')
      .select('id')
      .eq('user_id', user.id)
      .eq('item_id', itemId)
      .maybeSingle()

    if (!ownsItem) return { error: 'Você não possui este item.' }
  }

  let updateData = {}
  if (category === 'Fundos Animados') updateData = { equipped_background: itemId === 'none' ? null : itemId }
  if (category === 'Molduras de Avatar') updateData = { equipped_border: itemId === 'none' ? null : itemId }
  if (category === 'Títulos') updateData = { equipped_title: itemId === 'none' ? null : itemId }

  const { error } = await supabase.from('users').update(updateData).eq('id', user.id)
  if (error) return { error: 'Erro ao equipar o item.' }

  // Revalida usando o caminho completo para garantir atualização imediata
  const { data: userData } = await supabase.from('users').select('username').eq('id', user.id).single()
  revalidatePath(`/profile/${userData?.username}`)
  revalidatePath(`/profile/${userData?.username}/studio`)
  return { success: true }
}

export async function updateShowcase(gameIds: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Não autorizado' }

  const { data: userData } = await supabase.from('users').select('showcase_limit, username').eq('id', user.id).single()

  const limit = userData?.showcase_limit || 5
  if (gameIds.length > limit) return { error: `Limite máximo de ${limit} jogos excedido.` }

  const { error } = await supabase.from('users').update({ showcase_games: gameIds }).eq('id', user.id)

  if (error) return { error: 'Erro ao guardar a estante.' }

  revalidatePath(`/profile/${userData?.username}`)
  revalidatePath(`/profile/${userData?.username}/studio`)

  return { success: true }
}