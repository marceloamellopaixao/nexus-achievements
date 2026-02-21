'use client'

import React, { useState, useEffect } from "react";
import { saveSteamId, fetchSteamGamesList, processSingleGame, finalizeSync } from "./actions";
import { toast } from "react-toastify";
import { createClient } from "@/utils/supabase/client";

export default function IntegrationsPage() {
  const [steamId, setSteamId] = useState("");
  const [savedSteamId, setSavedSteamId] = useState<string | null>(null);
  const [loadingSave, setLoadingSave] = useState(false);
  const [loadingSync, setLoadingSync] = useState(false);

  // NOVOS ESTADOS PARA A BARRA DE PROGRESSO
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncMessage, setSyncMessage] = useState("");
  const [syncStats, setSyncStats] = useState({ coins: 0, plats: 0 });

  const supabase = createClient();

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('users').select('steam_id').eq('id', user.id).maybeSingle();
        if (data?.steam_id) {
          setSavedSteamId(data.steam_id);
          setSteamId(data.steam_id);
        }
      }
    }
    loadUser();
  }, [supabase]);

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('users').select('steam_id').eq('id', user.id).single();
        if (data?.steam_id) {
          setSavedSteamId(data.steam_id);
          setSteamId(data.steam_id);
        }
      }
    }
    loadUser();
  }, [supabase]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingSave(true);
    const result = await saveSteamId(steamId);
    if (result.error) toast.error(result.error);
    else { toast.success(result.success); setSavedSteamId(steamId); }
    setLoadingSave(false);
  };

  // A MÁGICA DA SINCRONIZAÇÃO EM LOTES
  const handleSync = async () => {
    setLoadingSync(true);
    setSyncProgress(0);
    setSyncStats({ coins: 0, plats: 0 });
    setSyncMessage("A procurar a tua biblioteca na Steam...");

    // 1. Pega a lista total
    const listResult = await fetchSteamGamesList();
    if (listResult.error || !listResult.games) {
      toast.error(listResult.error || 'Erro ao buscar jogos.');
      setLoadingSync(false);
      return;
    }

    const games = listResult.games;
    let totalCoins = 0;
    let totalPlats = 0;

    // 2. Processa 1 por 1
    for (let i = 0; i < games.length; i++) {
      const game = games[i];
      setSyncMessage(`A sincronizar: ${game.name} (${i + 1}/${games.length})`);

      const result = await processSingleGame(game, listResult.steamId);

      totalCoins += result.coins;
      totalPlats += result.plats;
      setSyncStats({ coins: totalCoins, plats: totalPlats });

      // Atualiza a barra
      setSyncProgress(((i + 1) / games.length) * 100);
    }

    // 3. Finaliza salvando o saldo
    setSyncMessage("A guardar os teus ganhos no Nexus...");
    await finalizeSync(totalCoins, totalPlats, games.length);

    toast.success(`Sincronização épica! Ganhaste +${totalCoins} Moedas e ${totalPlats} Platinas!`);
    setSyncMessage("");
    setSyncProgress(0);
    setLoadingSync(false);
  };

  const upcomingIntegrations = [
    { name: "PlayStation Network", icon: "🎮", color: "from-blue-600 to-blue-800", borderColor: "border-blue-500/20" },
    { name: "Xbox Live", icon: "🟢", color: "from-green-600 to-green-800", borderColor: "border-green-500/20" },
    { name: "Epic Games", icon: "⬛", color: "from-gray-700 to-gray-900", borderColor: "border-gray-500/20" }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto pb-10">

      {/* CABEÇALHO */}
      <div className="py-8 border-b border-border flex flex-col items-center text-center">
        <span className="text-5xl drop-shadow-[0_0_15px_rgba(59,130,246,0.3)] mb-4 block">🔗</span>
        <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">Centro de Integrações</h2>
        <p className="text-gray-400 mt-2 max-w-lg">
          Ligue as suas contas de jogo para alimentar o Nexus. Sincronize conquistas, ganhe moedas e suba no Hall da Fama.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 pt-4">

        <div className="bg-surface/50 border border-border rounded-3xl p-6 md:p-8 flex flex-col md:flex-row gap-8 items-start relative overflow-hidden shadow-2xl group">

          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-900/10 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-800/20 transition-colors"></div>

          <div className="w-20 h-20 bg-linear-to-br from-blue-900 to-black text-white rounded-2xl flex items-center justify-center text-4xl shrink-0 border border-blue-500/30 shadow-[0_0_20px_rgba(59,130,246,0.2)] z-10">
            <span className="drop-shadow-lg">☁️</span>
          </div>

          <div className="flex-1 space-y-6 z-10 w-full">
            <div>
              <h3 className="text-2xl font-black text-white">Steam</h3>
              <p className="text-sm text-gray-400 mt-2 leading-relaxed">
                Vincule sua <strong>Steam ID64</strong> para importar automaticamente todos os seus jogos e conquistas.
                Cada conquista desbloqueada será convertida em <span className="text-yellow-500 font-bold">🪙 Nexus Coins</span>.
              </p>
              <div className="mt-2 text-xs font-bold text-yellow-500/80 bg-yellow-500/10 inline-block px-3 py-1 rounded-md border border-yellow-500/20">
                {/* Corrigido: Uso de &quot; para aspas no texto */}
                ⚠️ O seu perfil e os detalhes dos jogos na Steam precisam estar &quot;Públicos&quot;.
              </div>
            </div>

            <form onSubmit={handleSave} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Ex: 76561198..."
                value={steamId}
                onChange={(e) => setSteamId(e.target.value)}
                className="flex-1 bg-background border border-border rounded-xl px-5 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-inner font-mono text-sm"
                required
              />
              <button
                type="submit"
                disabled={loadingSave}
                className={`px-8 py-3 font-black rounded-xl transition-all shadow-lg w-full sm:w-auto ${savedSteamId
                  ? 'bg-surface border border-border text-white hover:bg-white/5'
                  : 'bg-white text-black hover:bg-gray-200'
                  } disabled:opacity-50`}
              >
                {loadingSave ? 'A processar...' : savedSteamId ? 'Atualizar ID' : 'Vincular Conta'}
              </button>
            </form>

            {savedSteamId && (
              <div className="pt-6 border-t border-border/50 flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3 bg-green-500/10 px-4 py-2 rounded-xl border border-green-500/20">
                    <span className="text-sm text-green-400 font-bold">Sincronização Ativa</span>
                  </div>

                  <button
                    onClick={handleSync}
                    disabled={loadingSync}
                    className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <span className={`text-lg ${loadingSync ? 'animate-spin' : ''}`}>🔄</span>
                    {loadingSync ? 'A Sincronizar...' : 'Sincronizar Todos os Jogos'}
                  </button>
                </div>

                {/* BARRA DE PROGRESSO VISUAL */}
                {loadingSync && (
                  <div className="bg-background/80 p-4 rounded-xl border border-border">
                    <div className="flex justify-between text-xs font-bold mb-2 text-gray-400">
                      <span>{syncMessage}</span>
                      <span>{Math.round(syncProgress)}%</span>
                    </div>
                    <div className="w-full bg-surface rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-linear-to-r from-blue-500 to-purple-500 h-2.5 rounded-full transition-all duration-300"
                        style={{ width: `${syncProgress}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between mt-3 text-sm font-black">
                      <span className="text-yellow-500">🪙 +{syncStats.coins} Nexus Coins</span>
                      <span className="text-blue-400">🏆 +{syncStats.plats} Platinas</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <h3 className="text-xl font-black text-white mt-8 mb-2 flex items-center gap-2">
          <span>🔮</span> Em Desenvolvimento
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {upcomingIntegrations.map((integration, index) => (
            <div key={index} className="bg-surface/30 border border-border rounded-3xl p-6 relative overflow-hidden group cursor-not-allowed">
              <div className="absolute inset-0 bg-background/60 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <span className="text-3xl mb-2 drop-shadow-lg">🔒</span>
                <span className="text-sm font-bold text-white uppercase tracking-wider bg-black/50 px-3 py-1 rounded-full">Em Breve</span>
              </div>

              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-4 border ${integration.borderColor} bg-linear-to-br ${integration.color} opacity-50 grayscale group-hover:grayscale-0 transition-all`}>
                {integration.icon}
              </div>

              <h4 className="text-lg font-bold text-gray-400 group-hover:text-white transition-colors">{integration.name}</h4>
              <p className="text-xs text-gray-500 mt-2">Sincronização automática de troféus e perfil.</p>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}