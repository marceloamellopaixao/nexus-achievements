'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function purchaseItem(itemId: string, itemPrice: number) {
  if (!itemId || isNaN(itemPrice)) return { error: 'Dados inválidos.' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { error: 'Usuário não autenticado.' }

  // 1. Verifica saldo e dados do item
  const { data: itemData } = await supabase.from('shop_items').select('*').eq('id', itemId).single();
  const { data: userData } = await supabase.from('users').select('nexus_coins, showcase_limit').eq('id', user.id).single();

  if (!userData || userData.nexus_coins < itemPrice) {
    return { error: 'Saldo insuficiente para esta compra. Continue caçando platinas!' }
  }

  // 2. Deduz as moedas e insere no inventário (via RPC ou comando direto)
  const newBalance = userData.nexus_coins - itemPrice;
  const { error: updateError } = await supabase.from('users').update({ nexus_coins: newBalance }).eq('id', user.id);
  if (updateError) return { error: 'Erro ao processar o pagamento.' };

  const { error: inventoryError } = await supabase.from('user_inventory').insert({ user_id: user.id, item_id: itemId });

  if (inventoryError) {
    await supabase.from('users').update({ nexus_coins: userData.nexus_coins }).eq('id', user.id);
    return { error: 'Você já possui este item ou ocorreu um erro.' };
  }

  // 3. LÓGICA DE EXPANSÃO DE ESTANTE
  if (itemData?.category === 'Expansões') {
    let bonus = 0;
    if (itemId.includes('1')) bonus = 1;
    else if (itemId.includes('3')) bonus = 3;
    else if (itemId.includes('5')) bonus = 5;

    const newLimit = (userData.showcase_limit || 5) + bonus;
    await supabase.from('users').update({ showcase_limit: newLimit }).eq('id', user.id);
  }

  revalidatePath('/shop');
  revalidatePath('/profile/[username]', 'layout');
  return { success: true, message: 'Item adquirido com sucesso!' };
}