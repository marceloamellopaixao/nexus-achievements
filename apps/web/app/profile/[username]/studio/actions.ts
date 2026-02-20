'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function equipCosmetic(itemId: string, category: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Não autorizado' }

  // Verifica se o utilizador realmente possui o item no inventário
  const { data: ownsItem } = await supabase
    .from('user_inventory')
    .select('id')
    .eq('user_id', user.id)
    .eq('item_id', itemId)
    .single()

  if (!ownsItem && itemId !== 'none') {
    return { error: 'Você não possui este item.' }
  }

  // Define qual coluna será atualizada com base na categoria
  let updateData = {}
  if (category === 'Fundos Animados') updateData = { equipped_background: itemId === 'none' ? null : itemId }
  if (category === 'Molduras de Avatar') updateData = { equipped_border: itemId === 'none' ? null : itemId }
  if (category === 'Títulos Exclusivos') updateData = { equipped_title: itemId === 'none' ? null : itemId }

  const { error } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', user.id)

  if (error) return { error: 'Erro ao equipar o item.' }

  revalidatePath('/profile/[username]', 'page')
  revalidatePath('/profile/[username]/studio', 'page')
  return { success: true }
}

export async function updateShowcase(gameIds: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Não autorizado' }
  if (gameIds.length > 5) return { error: 'Limite máximo de 5 jogos excedido.' }

  const { error } = await supabase
    .from('users')
    .update({ showcase_games: gameIds })
    .eq('id', user.id)

  if (error) return { error: 'Erro ao guardar a estante de troféus.' }

  revalidatePath('/profile/[username]', 'page')
  revalidatePath('/profile/[username]/studio', 'page')
  
  return { success: true }
}