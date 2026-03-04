'use client'

import { useEffect, useRef } from 'react';
import { fetchSteamGamesList, processSingleGame, finalizeSync } from '@/app/integrations/actions';
import { createClient } from '@/utils/supabase/client';

export default function AutoSync() {
  const hasRun = useRef(false);
  const supabase = createClient();

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const executeBackgroundSync = () => {
      setTimeout(async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: userData, error } = await supabase
          .from('users')
          .select('last_steam_sync')
          .eq('id', user.id)
          .maybeSingle();

        if (error || !userData) {
          console.warn('⚠️ Falha silenciosa ao checar sync:', error?.message || 'Dados do usuário não encontrados');
          return;
        }

        const lastSync = userData.last_steam_sync ? new Date(userData.last_steam_sync).getTime() : 0;
        const now = new Date().getTime();

        // Checa se a última sync foi há mais de 1 hora (3600000 ms)
        if (now - lastSync > 3600000) {
          console.log('🤖 AutoSync Iniciado nos bastidores...');

          try {
            // 1. Busca a lista de jogos
            const listResult = await fetchSteamGamesList();

            if (listResult.error || !listResult.games) {
              console.warn('🤖 AutoSync abortado pela API:', listResult.error);

              await supabase.from('users').update({ last_steam_sync: new Date().toISOString() }).eq('id', user.id);
              return;
            }

            // 2. Limita a sincronização em background apenas aos 10 jogos mais recentes
            const recentGames = listResult.games.slice(0, 10);
            let totalCoins = 0; let totalPlats = 0;

            await Promise.all(recentGames.map(async (game) => {
              const result = await processSingleGame(game, listResult.steamId!);
              totalCoins += result.coins || 0;
              totalPlats += result.plats || 0;
            }));

            // 3. Finaliza a sync para registrar o horário e dar as moedas
            if (recentGames.length > 0) {
              console.log(`🤖 Finalizando AutoSync: ${totalCoins} Nexus Coins e ${totalPlats} Plats encontrados.`);
              console.log('🤖 Atualizando o relógio de sync e concedendo recompensas...');
              await finalizeSync(totalCoins, totalPlats, listResult.games.length);
            } else {
              // Caso a lista de jogos esteja vazia, garante a atualização do relógio
              console.log('🤖 Nenhum jogo recente encontrado para AutoSync, mas atualizando o relógio de sync.');
              await supabase.from('users').update({ last_steam_sync: new Date().toISOString() }).eq('id', user.id);
            }

            console.log(`🤖 AutoSync Concluído! +${totalCoins} Nexus Coins encontradas no background.`);
          } catch (err) {
            console.error('🤖 Erro fatal no AutoSync:', err);
          }
        }
      }, 5000); // Delay de 5 segundos para não impactar a experiência inicial
    }

    executeBackgroundSync();
  }, [supabase]);

  return null;
}