'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// Função para Guardar/Atualizar a ID
export async function linkPlatform(formData: FormData) {
  const platform = formData.get('platform') as string
  const platformId = formData.get('platformId') as string

  // Se faltarem dados, simplesmente interrompe a execução (retorna void)
  if (!platform || !platformId) return 

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) throw new Error('Não autorizado')

  const { error } = await supabase
    .from('linked_accounts')
    .upsert({ 
      user_id: user.id, 
      platform: platform, 
      platform_user_id: platformId 
    }, { onConflict: 'user_id, platform' })

  if (error) {
    console.error("Erro no Supabase:", error)
    return 
  }

  // Atualiza a página automaticamente para mostrar o novo estado
  revalidatePath('/integrations')
}

// Função para Remover a ID
export async function unlinkPlatform(formData: FormData) {
  const platform = formData.get('platform') as string

  if (!platform) return

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return

  const { error } = await supabase
    .from('linked_accounts')
    .delete()
    .eq('user_id', user.id)
    .eq('platform', platform)

  if (error) {
    console.error("Erro ao desconectar:", error)
    return
  }

  revalidatePath('/integrations')
}