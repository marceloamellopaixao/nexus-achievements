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
          .select('last_steam_sync, nexus_coins, global_level')
          .eq('id', user.id)
          .maybeSingle();

        if (error || !userData) {
          console.warn('⚠️ Falha silenciosa ao checar sync:', error?.message || 'Dados do usuário não encontrados');
          return;
        }

        // ==============================================================
        // 🔥 PROTOCOLO DE AUTO-CURA (SELF-HEALING) DO NÍVEL GLOBAL
        // Valida se o nível atual condiz matematicamente com as moedas.
        // Se houver anomalias (dados legados), corrige instantaneamente!
        // ==============================================================
        const currentCoins = userData.nexus_coins || 0;
        const expectedLevel = Math.max(1, Math.floor(Math.sqrt(currentCoins / 25)) + 1);

        if (expectedLevel !== userData.global_level) {
          console.log(`🔧 [AUTO-CURA] Corrigindo anomalia de Nível: de Lvl ${userData.global_level} para Lvl ${expectedLevel}`);
          await supabase.from('users').update({ global_level: expectedLevel }).eq('id', user.id);
        }

        // ==============================================================
        // 🔄 ROTINA DE SINCRONIZAÇÃO DA STEAM (1 Hora de Cooldown)
        // ==============================================================
        const lastSync = userData.last_steam_sync ? new Date(userData.last_steam_sync).getTime() : 0;
        const now = new Date().getTime();

        if (now - lastSync > 3600000) {
          console.log('🤖 AutoSync Iniciado nos bastidores...');

          try {
            const listResult = await fetchSteamGamesList();

            if (listResult.error || !listResult.games) {
              console.warn('🤖 AutoSync abortado pela API:', listResult.error);

              await supabase.from('users').update({ last_steam_sync: new Date().toISOString() }).eq('id', user.id);
              return;
            }

            const recentGames = listResult.games.slice(0, 10);
            let totalCoins = 0; let totalPlats = 0;

            await Promise.all(recentGames.map(async (game) => {
              const result = await processSingleGame(game, listResult.steamId!);
              totalCoins += result.coins || 0;
              totalPlats += result.plats || 0;
            }));

            if (recentGames.length > 0) {
              console.log(`🤖 Finalizando AutoSync: ${totalCoins} Nexus Coins e ${totalPlats} Plats encontrados.`);
              console.log('🤖 Atualizando o relógio de sync e concedendo recompensas...');

              await finalizeSync(totalCoins, totalPlats, listResult.games.length);
            } else {
              console.log(`🤖 AutoSync Concluído! +${totalCoins} Nexus Coins encontradas no background.`);
              await supabase.from('users').update({ last_steam_sync: new Date().toISOString() }).eq('id', user.id);
            }
            console.log(`🤖 AutoSync Concluído! +${totalCoins} Nexus Coins encontradas no background.`);
          } catch (err) {
            console.error('🤖 Erro fatal no AutoSync:', err);

          }
        }
      }, 5000);
    };

    executeBackgroundSync();
  }, [supabase]);

  return null;
}