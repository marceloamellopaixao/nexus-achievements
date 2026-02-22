'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

async function checkAdmin() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const { data } = await supabase.from('users').select('role').eq('id', user.id).single()
    return data?.role === 'admin'
}

// 1. DISTRIBUIR MOEDAS PARA TODOS
export async function distributeCoinsToAll(amount: number) {
    if (!(await checkAdmin()) || amount <= 0) return { error: 'Não autorizado ou valor inválido.' }

    const supabase = await createClient()

    // Incrementa as moedas de todos os usuários de uma vez
    const { error } = await supabase.rpc('distribute_coins_global', { amount_to_add: amount })

    if (error) return { error: 'Erro na distribuição.' }
    revalidatePath('/', 'layout')
    return { success: `🎉 ${amount} moedas enviadas para todos os caçadores!` }
}

// 2. PUBLICAR ANÚNCIO GLOBAL
export async function setGlobalAnnouncement(message: string, type: string) {
    if (!(await checkAdmin())) return { error: 'Acesso negado.' }

    const supabase = await createClient()

    // Desativa anúncios antigos e insere o novo
    await supabase.from('system_announcements').update({ is_active: false }).eq('is_active', true)

    if (message.trim() !== "") {
        const { error } = await supabase.from('system_announcements').insert([{ message, type, is_active: true }])
        if (error) return { error: 'Erro ao publicar.' }
    }

    revalidatePath('/', 'layout')
    return { success: 'Status do Nexus atualizado!' }
}

interface ShopItemFormData {
    name: string;
    price: string;
    category: string;
    rarity: string;
    style: string;
}

// 1. ADICIONAR ITEM NA LOJA
export async function addShopItem(formData: ShopItemFormData) {
    if (!(await checkAdmin())) return { error: 'Acesso negado.' }

    const supabase = await createClient()
    const { error } = await supabase.from('shop_items').insert([{
        name: formData.name,
        price: parseInt(formData.price),
        category: formData.category,
        rarity_type: formData.rarity,
        gradient: formData.category === 'Fundos Animados' ? formData.style : null,
        border_style: formData.category === 'Molduras de Avatar' ? formData.style : null,
        tag_style: formData.category === 'Títulos Exclusivos' ? formData.style : null,
    }])

    if (error) return { error: 'Erro ao criar item.' }
    revalidatePath('/shop')
    return { success: 'Item adicionado à vitrine!' }
}

// 2. RESET GLOBAL DE DADOS (O que você pediu)
export async function performGlobalReset() {
    if (!(await checkAdmin())) return { error: 'Acesso negado.' }

    const supabase = await createClient()

    // Executa os truncates
    await supabase.rpc('danger_zone_reset') // Criaremos esta função SQL abaixo

    revalidatePath('/')
    return { success: 'O Nexus foi resetado com sucesso!' }
}