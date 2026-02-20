'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function purchaseItem(itemId: string, itemPrice: number) {
  if (!itemId || isNaN(itemPrice)) return { error: 'Dados inválidos.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Usuário não autenticado.' }

  // 1. Verifica saldo
  const { data: userData } = await supabase
    .from('users')
    .select('nexus_coins')
    .eq('id', user.id)
    .single()

  if (!userData || userData.nexus_coins < itemPrice) {
    return { error: 'Saldo insuficiente para esta compra. Continue caçando platinas!' }
  }

  // 2. Deduz as moedas
  const newBalance = userData.nexus_coins - itemPrice
  const { error: updateError } = await supabase
    .from('users')
    .update({ nexus_coins: newBalance })
    .eq('id', user.id)

  if (updateError) return { error: 'Erro ao processar o pagamento.' }

  // 3. Adiciona ao inventário
  const { error: inventoryError } = await supabase
    .from('user_inventory')
    .insert({ user_id: user.id, item_id: itemId })

  if (inventoryError) {
    // Estorno caso dê erro (ex: já possui o item)
    await supabase.from('users').update({ nexus_coins: userData.nexus_coins }).eq('id', user.id)
    return { error: 'Você já possui este item ou ocorreu um erro no servidor.' }
  }

  // Atualiza a loja e a topbar
  revalidatePath('/shop')
  revalidatePath('/') // Revalida o layout global para atualizar as moedas no topo
  
  return { success: true, message: 'Item adquirido com sucesso!' }
}