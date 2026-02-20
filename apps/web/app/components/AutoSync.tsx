'use client'

import { useEffect, useRef } from 'react';
import { syncSteamAchievements } from '@/app/integrations/actions';
import { createClient } from '@/utils/supabase/client';

export default function AutoSync() {
  const hasRun = useRef(false);
  const supabase = createClient();

  useEffect(() => {
    // Evita rodar duas vezes no StrictMode do React
    if (hasRun.current) return;
    hasRun.current = true;

    async function checkAndSync() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('last_steam_sync')
        .eq('id', user.id)
        .single();

      const lastSync = userData?.last_steam_sync ? new Date(userData.last_steam_sync).getTime() : 0;
      const now = new Date().getTime();
      
      // Checa se a última sync foi há mais de 1 hora (3600000 ms)
      // Se for a primeira vez (0), ele também roda.
      if (now - lastSync > 3600000) {
        console.log('🤖 AutoSync Iniciado nos bastidores...');
        // Roda a action sem bloquear a tela e sem mostrar toast (silencioso)
        await syncSteamAchievements();
        console.log('🤖 AutoSync Concluído!');
      }
    }

    checkAndSync();
  }, [supabase]);

  return null; // Componente totalmente invisível
}