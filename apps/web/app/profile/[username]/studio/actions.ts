'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

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
  if (category === 'Títulos Exclusivos') updateData = { equipped_title: itemId === 'none' ? null : itemId }

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

  // 1. Busca o limite real e o username do utilizador
  const { data: userData } = await supabase
    .from('users')
    .select('showcase_limit, username')
    .eq('id', user.id)
    .single()

  const limit = userData?.showcase_limit || 5
  if (gameIds.length > limit) return { error: `Limite máximo de ${limit} jogos excedido.` }

  // 2. Atualiza a estante
  const { error } = await supabase
    .from('users')
    .update({ showcase_games: gameIds })
    .eq('id', user.id)

  if (error) return { error: 'Erro ao guardar a estante.' }

  revalidatePath(`/profile/${userData?.username}`)
  revalidatePath(`/profile/${userData?.username}/studio`)
  
  return { success: true }
}