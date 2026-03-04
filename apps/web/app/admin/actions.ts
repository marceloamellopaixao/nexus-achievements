'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'

function getAdminClient() {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        throw new Error("Variáveis de ambiente para Supabase não configuradas corretamente.")
    } 

    return createSupabaseAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
}

// FUNÇÕES DE VERIFICAÇÃO DE PERMISSÕES
async function checkAdmin() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const { data } = await supabase.from('users').select('role').eq('id', user.id).single()
    return data?.role === 'admin'
}

async function checkModerator() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const { data } = await supabase.from('users').select('role').eq('id', user.id).single()
    return data?.role === 'moderator'
}

// 1. DISTRIBUIR MOEDAS PARA USUÁRIO ESPECÍFICO (CORRIGIDO COM SERVICE ROLE)
export async function distributeCoinsToUser(username: string, amount: number) {
    if (!(await checkAdmin()) || amount <= 0) return { error: 'Não autorizado ou valor inválido.' }

    const adminDb = getAdminClient()
    
    // Busca o ID do usuário
    const { data: targetUser, error: userError } = await adminDb.from('users').select('id, nexus_coins').eq('username', username).single()
    if (userError || !targetUser) return { error: 'Usuário não encontrado.' }

    // Atualiza diretamente usando o Admin Client
    const { error } = await adminDb.from('users').update({ 
        nexus_coins: (targetUser.nexus_coins || 0) + amount 
    }).eq('id', targetUser.id)

    if (error) return { error: `Erro na distribuição: ${error.message}` }
    
    revalidatePath('/', 'layout')
    return { success: `🎉 ${amount} moedas enviadas para ${username}!` }
}

// 1.1 DISTRIBUIR MOEDAS PARA TODOS
export async function distributeCoinsToAll(amount: number) {
    if (!(await checkAdmin()) || amount <= 0) return { error: 'Não autorizado ou valor inválido.' }

    const adminDb = getAdminClient()
    const { error } = await adminDb.rpc('distribute_coins_global', { amount_to_add: amount })

    if (error) return { error: `Erro na distribuição: ${error.message}` }
    
    revalidatePath('/', 'layout')
    return { success: `🎉 ${amount} moedas enviadas para todos os caçadores!` }
}

// 2. PUBLICAR ANÚNCIO GLOBAL
export async function setGlobalAnnouncement(message: string, type: string) {
    if (!(await checkAdmin())) return { error: 'Acesso negado.' }

    const adminDb = getAdminClient()
    await adminDb.from('system_announcements').update({ is_active: false }).eq('is_active', true)

    if (message.trim() !== "") {
        const { error } = await adminDb.from('system_announcements').insert([{ message, type, is_active: true }])
        if (error) return { error: 'Erro ao publicar.' }
    }

    revalidatePath('/', 'layout')
    return { success: 'Status do Nexus atualizado!' }
}

interface ShopItemFormData { name: string; price: string; category: string; rarity: string; style: string; }

// 3. ADICIONAR ITEM NA LOJA
export async function addShopItem(formData: ShopItemFormData) {
    if (!(await checkAdmin())) return { error: 'Acesso negado.' }

    const adminDb = getAdminClient()
    const { error } = await adminDb.from('shop_items').insert([{
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
    const adminDb = getAdminClient()
    await adminDb.rpc('danger_zone_reset') 
    revalidatePath('/')
    return { success: 'O Nexus foi resetado com sucesso!' }
}

// 5. RESET GLOBAL & DIRECIONADO
export async function performTargetedReset(targetUsernameOrId: string, options: { games: boolean, social: boolean, inventory: boolean, stats: boolean }) {
    if (!(await checkAdmin())) return { error: 'Acesso negado.' }
    if (!targetUsernameOrId) return { error: 'Forneça um ID, Username ou Email válido.' }

    const adminDb = getAdminClient()
    const target = targetUsernameOrId.trim();
    let userId = target;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(target);

    if (!isUUID) {
        const { data: user, error: userError } = await adminDb.from('users').select('id').or(`username.ilike.${target},email.ilike.${target}`).maybeSingle();
        if (userError || !user) return { error: `Caçador não encontrado no sistema.` }
        userId = user.id;
    }

    const { error } = await adminDb.rpc('target_user_reset', {
        target_user_id: userId, reset_games: options.games, reset_social: options.social, reset_inventory: options.inventory, reset_stats: options.stats
    });

    if (error) return { error: `Falha ao limpar o alvo: ${error.message}` }
    revalidatePath('/', 'layout')
    return { success: `A mente e o progresso do alvo foram limpos com sucesso.` }
}

// 6. ATUALIZAR STATUS DE DENÚNCIA
export async function updateReportStatus(reportId: string, newStatus: 'resolved' | 'dismissed') {
    if (!(await checkAdmin() || await checkModerator())) return { error: 'Acesso negado.' }
    const adminDb = getAdminClient()
    
    const { error } = await adminDb.from('user_reports').update({ status: newStatus }).eq('id', reportId);
    if (error) return { error: 'Falha ao atualizar denúncia.' }
    
    revalidatePath('/admin')
    return { success: newStatus === 'resolved' ? 'Denúncia resolvida!' : 'Denúncia descartada.' }
}

// 7. BUSCAR DETALHES PARA SINCRONIZAÇÃO FORÇADA
export async function getTargetSyncDetails(username: string) {
    if (!(await checkAdmin())) return { error: 'Acesso negado.' };
    const adminDb = getAdminClient();
    
    const { data: user } = await adminDb.from('users').select('id, steam_id').eq('username', username).single();
    if (!user) return { error: 'Usuário não encontrado.' };

    const { data: linked } = await adminDb.from('linked_accounts').select('*').eq('user_id', user.id);
    const psn = linked?.find(a => a.platform === 'PlayStation')?.platform_user_id || null;
    const xbox = linked?.find(a => a.platform === 'Xbox')?.platform_user_id || null;
    const epic = linked?.find(a => a.platform === 'Epic')?.platform_user_id || null;

    return { userId: user.id, steamId: user.steam_id, psnId: psn, xboxId: xbox, epicId: epic };
}

// 🔥 8. BANIR USUÁRIO
export async function banUser(username: string) {
    if (!(await checkAdmin() || await checkModerator())) return { error: 'Acesso negado.' };
    if (!username) return { error: 'Username não fornecido.' };

    const adminDb = getAdminClient();
    
    // Ano 3000 = Ban Permanente
    const banDate = new Date('3000-01-01T00:00:00Z').toISOString();
    
    const { error } = await adminDb.from('users').update({ banned_until: banDate }).eq('username', username.trim());
    if (error) return { error: 'Falha ao aplicar punição.' };

    return { success: `${username} foi exilado do Nexus permanentemente.` };
}

// 9. APLICAR MULTA FINANCEIRA
export async function applyFineToUser(username: string, mode: 'exact' | 'half' | 'zero', exactAmount?: number) {
    if (!(await checkAdmin() || await checkModerator())) return { error: 'Acesso negado.' };
    if (!username) return { error: 'Username não fornecido.' };

    const adminDb = getAdminClient();
    const { data: user, error: userError } = await adminDb.from('users').select('id, nexus_coins').eq('username', username.trim()).single();
    
    if (userError || !user) return { error: 'Usuário não encontrado.' };

    const currentCoins = user.nexus_coins || 0;
    let newBalance = currentCoins;
    let penaltyDesc = '';

    if (mode === 'zero') {
        newBalance = 0;
        penaltyDesc = 'fortuna completamente zerada';
    } else if (mode === 'half') {
        newBalance = Math.floor(currentCoins / 2);
        penaltyDesc = 'fortuna reduzida pela metade';
    } else if (mode === 'exact' && exactAmount) {
        newBalance = Math.max(0, currentCoins - exactAmount); // Nunca deixa ficar negativo
        penaltyDesc = `multa de ${exactAmount} moedas aplicada`;
    }

    const { error } = await adminDb.from('users').update({ nexus_coins: newBalance }).eq('id', user.id);
    
    if (error) return { error: 'Falha ao aplicar multa.' };
    
    revalidatePath('/', 'layout');
    return { success: `Punição executada: [${username}] teve a ${penaltyDesc}.` };
}