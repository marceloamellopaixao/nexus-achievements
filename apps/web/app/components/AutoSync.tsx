'use client'

import { useEffect, useRef } from 'react';
import { fetchSteamGamesList, processSingleGame, finalizeSync } from '@/app/integrations/actions';
import { createClient } from '@/utils/supabase/client';

export default function AutoSync() {
  const hasRun = useRef(false);
  const supabase = createClient();

  useEffect(() => {
    // Evita rodar duas vezes no StrictMode do React em dev
    if (hasRun.current) return;
    hasRun.current = true;

    async function checkAndSync() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData, error } = await supabase
        .from('users')
        .select('last_steam_sync')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.warn('⚠️ Falha silenciosa ao checar sync:', error.message);
        return;
      }

      // Se o usuário ainda não existir na tabela public.users, aborta
      if (!userData) return;

      const lastSync = userData.last_steam_sync ? new Date(userData.last_steam_sync).getTime() : 0;
      const now = new Date().getTime();
      
      // Checa se a última sync foi há mais de 1 hora (3600000 ms)
      if (now - lastSync > 3600000) {
        console.log('🤖 AutoSync Iniciado nos bastidores...');
        
        try {
          // 1. Busca a lista de jogos
          const listResult = await fetchSteamGamesList();
          if (listResult.error || !listResult.games) {
            console.warn('🤖 AutoSync abortado:', listResult.error);
            return;
          }

          // 2. Limita a sincronização em background apenas aos 15 jogos mais recentes
          // Isso mantém o site leve e atualiza o que o jogador acabou de jogar!
          const recentGames = listResult.games.slice(0, 15);
          let totalCoins = 0;
          let totalPlats = 0;

          for (const game of recentGames) {
            const result = await processSingleGame(game, listResult.steamId);
            totalCoins += result.coins || 0;
            totalPlats += result.plats || 0;
          }

          // 3. Finaliza a sync para registrar o horário e dar as moedas
          if (recentGames.length > 0) {
            await finalizeSync(totalCoins, totalPlats, listResult.games.length);
          }
          
          console.log(`🤖 AutoSync Concluído! +${totalCoins} Moedas encontradas no background.`);
        } catch (err) {
          console.error('🤖 Erro no AutoSync:', err);
        }
      }
    }

    checkAndSync();
  }, [supabase]);

  return null;
}