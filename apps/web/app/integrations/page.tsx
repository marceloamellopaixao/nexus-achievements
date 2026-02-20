'use client'

import React, { useState, useEffect } from "react";
import { saveSteamId, syncSteamAchievements } from "./actions";
import { toast } from "react-toastify";
import { createClient } from "@/utils/supabase/client";

export default function IntegrationsPage() {
  const [steamId, setSteamId] = useState("");
  const [savedSteamId, setSavedSteamId] = useState<string | null>(null);
  const [loadingSave, setLoadingSave] = useState(false);
  const [loadingSync, setLoadingSync] = useState(false);
  const supabase = createClient();

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
    else {
      toast.success(result.success);
      setSavedSteamId(steamId);
    }
    setLoadingSave(false);
  };

  const handleSync = async () => {
    setLoadingSync(true);
    const result = await syncSteamAchievements();
    if (result.error) toast.error(result.error);
    else toast.success(result.success, { icon: "🔄" });
    setLoadingSync(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-4xl mx-auto pb-10">
      <div className="py-6 border-b border-border">
        <h2 className="text-3xl font-black text-white tracking-tight">🔗 Integrações</h2>
        <p className="text-gray-400 mt-1">Conecte as suas contas para alimentar o seu Nexus.</p>
      </div>

      {/* Steam Integration Card */}
      <div className="bg-surface border border-border rounded-2xl p-6 md:p-8 flex flex-col md:flex-row gap-8 items-start">
        <div className="w-16 h-16 bg-blue-900/20 text-blue-500 rounded-2xl flex items-center justify-center text-3xl shrink-0 border border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]">
          <i className="Steam-Icon">🎮</i>
        </div>

        <div className="flex-1 space-y-4">
          <div>
            <h3 className="text-xl font-bold text-white">Steam</h3>
            <p className="text-sm text-gray-400 mt-1">
              Vincule sua Steam ID64 para sincronizar seus jogos e converter conquistas em Nexus Coins. 
              <br/>Seu perfil na Steam precisa ser <strong>Público</strong>.
            </p>
          </div>

          <form onSubmit={handleSave} className="flex gap-2">
            <input 
              type="text" 
              placeholder="Sua Steam ID (Ex: 76561198...)" 
              value={steamId}
              onChange={(e) => setSteamId(e.target.value)}
              className="flex-1 bg-background border border-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors"
              required
            />
            <button 
              type="submit"
              disabled={loadingSave}
              className="px-6 py-2.5 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              {loadingSave ? 'Salvando...' : savedSteamId ? 'Atualizar ID' : 'Vincular'}
            </button>
          </form>

          {savedSteamId && (
            <div className="pt-4 border-t border-border mt-4 flex items-center justify-between">
              <span className="text-sm text-green-400 font-bold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Conta Vinculada
              </span>
              <button 
                onClick={handleSync}
                disabled={loadingSync}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-sm transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 flex items-center gap-2"
              >
                {loadingSync ? 'Sincronizando...' : '🔄 Forçar Sincronização'}
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}