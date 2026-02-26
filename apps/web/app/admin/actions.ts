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
    const { error } = await supabase.rpc('distribute_coins_global', { amount_to_add: amount })

    if (error) return { error: 'Erro na distribuição.' }
    revalidatePath('/', 'layout')
    return { success: `🎉 ${amount} moedas enviadas para todos os caçadores!` }
}

// 2. PUBLICAR ANÚNCIO GLOBAL
export async function setGlobalAnnouncement(message: string, type: string) {
    if (!(await checkAdmin())) return { error: 'Acesso negado.' }

    const supabase = await createClient()
    await supabase.from('system_announcements').update({ is_active: false }).eq('is_active', true)

    if (message.trim() !== "") {
        const { error } = await supabase.from('system_announcements').insert([{ message, type, is_active: true }])
        if (error) return { error: 'Erro ao publicar.' }
    }

    revalidatePath('/', 'layout')
    return { success: 'Status do Nexus atualizado!' }
}

interface ShopItemFormData { name: string; price: string; category: string; rarity: string; style: string; }

// 3. ADICIONAR ITEM NA LOJA
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

// 4. RESET GLOBAL DE DADOS
export async function performGlobalReset() {
    if (!(await checkAdmin())) return { error: 'Acesso negado.' }
    const supabase = await createClient()
    await supabase.rpc('danger_zone_reset') 
    revalidatePath('/')
    return { success: 'O Nexus foi resetado com sucesso!' }
}

// 5. RESET GLOBAL & DIRECIONADO
export async function performTargetedReset(targetUsernameOrId: string, options: { games: boolean, social: boolean, inventory: boolean, stats: boolean }) {
    if (!(await checkAdmin())) return { error: 'Acesso negado.' }
    if (!targetUsernameOrId) return { error: 'Forneça um ID, Username ou Email válido.' }

    const supabase = await createClient()
    const target = targetUsernameOrId.trim();
    let userId = target;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(target);

    if (!isUUID) {
        const { data: user, error: userError } = await supabase.from('users').select('id').or(`username.ilike.${target},email.ilike.${target}`).maybeSingle();
        if (userError || !user) return { error: `Caçador não encontrado no sistema.` }
        userId = user.id;
    }

    const { error } = await supabase.rpc('target_user_reset', {
        target_user_id: userId, reset_games: options.games, reset_social: options.social, reset_inventory: options.inventory, reset_stats: options.stats
    });

    if (error) return { error: `Falha ao limpar o alvo: ${error.message}` }
    revalidatePath('/', 'layout')
    return { success: `A mente e o progresso do alvo foram limpos com sucesso.` }
}

// 6. ATUALIZAR STATUS DE DENÚNCIA
export async function updateReportStatus(reportId: string, newStatus: 'resolved' | 'dismissed') {
    if (!(await checkAdmin())) return { error: 'Acesso negado.' }
    const supabase = await createClient()
    
    const { error } = await supabase.from('user_reports').update({ status: newStatus }).eq('id', reportId);
    if (error) return { error: 'Falha ao atualizar denúncia.' }
    
    revalidatePath('/admin')
    return { success: newStatus === 'resolved' ? 'Denúncia resolvida!' : 'Denúncia descartada.' }
}