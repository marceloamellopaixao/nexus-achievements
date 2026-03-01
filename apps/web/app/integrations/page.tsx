'use client'

import React, { useState, useEffect, Dispatch, SetStateAction, ReactNode, useRef } from "react";
import { saveSteamId, fetchSteamGamesList, processSingleGame, finalizeSync, linkPlatformAccount } from "./actions";
import { fetchPlayStationGamesList, processSinglePlayStationGame, TitleThin } from "./psn"; 
import { toast } from "react-toastify";
import { createClient } from "@/utils/supabase/client";
import { FaPlaystation, FaSteam, FaXbox, FaLock, FaLink, FaTrophy, FaTerminal } from "react-icons/fa";
import { SiEpicgames } from "react-icons/si";
import { BiSolidCoinStack } from "react-icons/bi";
import { FiLoader } from "react-icons/fi";

// ==========================================
// COMPONENTE REUTILIZÁVEL: CARTÃO DE PLATAFORMA
// ==========================================
interface PlatformCardProps {
  platform: string;
  title: string;
  icon: ReactNode;
  description: ReactNode;
  inputId: string;
  savedId: string | null;
  loading: boolean;
  onInputChange: (val: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  placeholder: string;
  theme: {
    glow: string;
    iconBg: string;
    iconBorder: string;
    btn: string;
    btnHover: string;
    tagBg: string;
    tagBorder: string;
    tagText: string;
  };
  actionButton?: ReactNode; 
  expandedContent?: ReactNode;
}

function PlatformCard({ platform, title, icon, description, inputId, savedId, loading, onInputChange, onSubmit, placeholder, theme, actionButton, expandedContent }: PlatformCardProps) {
  return (
    <div className="bg-surface/50 border border-border rounded-3xl p-6 md:p-8 flex flex-col md:flex-row gap-8 items-start relative overflow-hidden shadow-2xl group transition-all duration-300">
      <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl pointer-events-none transition-colors ${theme.glow}`}></div>
      <div className={`w-20 h-20 text-white rounded-2xl flex items-center justify-center text-4xl shrink-0 border shadow-lg z-10 ${theme.iconBg} ${theme.iconBorder}`}>
        <span className="drop-shadow-lg">{icon}</span>
      </div>
      <div className="flex-1 space-y-6 z-10 w-full">
        <div>
          <h3 className="text-2xl font-black text-white">{title}</h3>
          <div className="text-sm text-gray-400 mt-2 max-w-xl leading-relaxed">{description}</div>
        </div>
        <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-3">
          <input type="text" placeholder={placeholder} value={inputId} onChange={(e) => onInputChange(e.target.value)} required className="flex-1 bg-background border border-border rounded-xl px-5 py-3 text-white focus:outline-none focus:ring-1 transition-all shadow-inner font-mono text-sm focus:border-white/50 focus:ring-white/30" />
          <button type="submit" disabled={loading} className={`px-8 py-3 font-black rounded-xl transition-all shadow-lg w-full sm:w-auto disabled:opacity-50 ${savedId ? 'bg-surface border border-border text-white hover:bg-white/5' : `${theme.btn} text-white ${theme.btnHover}`}`}>
            {loading ? 'Processando...' : savedId ? 'Atualizar ID' : 'Vincular Conta'}
          </button>
        </form>
        {savedId && (
          <div className="pt-6 border-t border-border/50 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border max-w-full ${theme.tagBg} ${theme.tagBorder}`}>
                <span className={`text-sm font-bold truncate ${theme.tagText}`}>{platform}: <span className="text-white">{savedId}</span></span>
              </div>
              {actionButton}
            </div>
            {expandedContent}
          </div>
        )}
      </div>
    </div>
  );
}

export default function IntegrationsPage() {
  const [steamId, setSteamId] = useState("");
  const [savedSteamId, setSavedSteamId] = useState<string | null>(null);
  const [steamUsername, setSteamUsername] = useState<string | null>(null);
  const [loadingSave, setLoadingSave] = useState(false);

  const [psnId, setPsnId] = useState("");
  const [savedPsnId, setSavedPsnId] = useState<string | null>(null);
  const [loadingPsn, setLoadingPsn] = useState(false);

  const [xboxId, setXboxId] = useState("");
  const [savedXboxId, setSavedXboxId] = useState<string | null>(null);
  const [loadingXbox, setLoadingXbox] = useState(false);

  const [epicId, setEpicId] = useState("");
  const [savedEpicId, setSavedEpicId] = useState<string | null>(null);
  const [loadingEpic, setLoadingEpic] = useState(false);

  const [syncingPlatform, setSyncingPlatform] = useState<'Steam' | 'PlayStation' | null>(null);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncMessage, setSyncMessage] = useState("");
  const [syncStats, setSyncStats] = useState({ coins: 0, plats: 0 });
  
  const [syncTerminal, setSyncTerminal] = useState<string[]>([]);
  const terminalRef = useRef<HTMLDivElement>(null);

  const supabase = createClient();

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('users').select('steam_id').eq('id', user.id).maybeSingle();
        if (data?.steam_id) { setSavedSteamId(data.steam_id); setSteamId(data.steam_id); }

        const { data: linked } = await supabase.from('linked_accounts').select('*').eq('user_id', user.id);
        linked?.forEach(acc => {
          const displayName = acc.platform_username || acc.platform_user_id;
          if (acc.platform === 'Steam') setSteamUsername(displayName);
          if (acc.platform === 'PlayStation') { setPsnId(acc.platform_user_id); setSavedPsnId(displayName); }
          if (acc.platform === 'Xbox') { setXboxId(acc.platform_user_id); setSavedXboxId(displayName); }
          if (acc.platform === 'Epic') { setEpicId(acc.platform_user_id); setSavedEpicId(displayName); }
        });
      }
    }
    loadUser();
  }, [supabase]);

  // Auto-scroll do terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [syncTerminal]);

  const pushLog = (msg: string) => {
    setSyncTerminal(prev => [...prev, msg]);
  };

  const handleSaveSteam = async (e: React.FormEvent) => {
    e.preventDefault(); setLoadingSave(true);
    const result = await saveSteamId(steamId) as { error?: string; success?: string; username?: string };
    if (result.error) toast.error(result.error, { theme: 'dark' });
    else if (result.success) { toast.success(result.success, { theme: 'dark' }); setSavedSteamId(steamId); if (result.username) setSteamUsername(result.username); }
    setLoadingSave(false);
  };

  const handleSavePlatform = async (platform: string, platformId: string, setLoading: Dispatch<SetStateAction<boolean>>, setSaved: Dispatch<SetStateAction<string | null>>) => {
    setLoading(true);
    const res = await linkPlatformAccount(platform, platformId);
    if (res.error) toast.error(res.error, { theme: 'dark' });
    else { toast.success(res.success, { theme: 'dark' }); setSaved(platformId); }
    setLoading(false);
  }

  // ==========================================
  // LÓGICA DE SINCRONIZAÇÃO STEAM
  // ==========================================
  const handleSyncSteam = async () => {
    setSyncingPlatform('Steam'); setSyncProgress(0); setSyncStats({ coins: 0, plats: 0 }); setSyncTerminal([]);
    setSyncMessage("Procurando a sua biblioteca na Steam...");
    pushLog(`📡 Iniciando varredura na Steam para: ${savedSteamId}`);

    const listResult = await fetchSteamGamesList();
    if (listResult.error || !listResult.games) {
      toast.error(listResult.error || 'Erro ao buscar jogos.', { theme: 'dark' });
      pushLog(`❌ Falha Crítica: ${listResult.error}`);
      setSyncingPlatform(null); return;
    }

    const games = listResult.games;
    pushLog(`✅ Biblioteca carregada. ${games.length} jogos encontrados.`);
    let totalCoins = 0; let totalPlats = 0;

    for (let i = 0; i < games.length; i++) {
      const game = games[i]; if (!game) continue;
      
      setSyncMessage(`Sincronizando: ${game.name} (${i + 1}/${games.length})`);
      pushLog(`> Analisando: ${game.name}...`);
      
      const result = await processSingleGame(game, listResult.steamId);
      totalCoins += result.coins; totalPlats += result.plats;
      setSyncStats({ coins: totalCoins, plats: totalPlats });
      
      if (result.coins > 0 || result.plats > 0) pushLog(`  ↳ 💰 +${result.coins} Coins | 🏆 +${result.plats} Platinas`);
      // Total de Conquistas do Jogo para feedback detalhado
      else if (game.total_achievements) pushLog(`  ↳ ✔️ ${game.total_achievements} conquistas, mas nenhuma nova para sincronizar.`);
      else pushLog(`  ↳ ✔️ Banco atualizado.`);

      setSyncProgress(((i + 1) / games.length) * 100);
    }

    pushLog(`🏁 Salvando totais...`);
    setSyncMessage("Guardando os seus ganhos no Nexus...");
    await finalizeSync(totalCoins, totalPlats, games.length);

    pushLog(`✅ Sincronização Concluída!`);
    toast.success(`Sincronização concluída!`, { theme: 'dark' });
    setTimeout(() => { setSyncMessage(""); setSyncProgress(0); setSyncingPlatform(null); }, 3000);
  };

  // ==========================================
  // LÓGICA DE SINCRONIZAÇÃO PSN (COM TERMINAL)
  // ==========================================
  const handleSyncPSN = async () => {
    if (!savedPsnId) return;
    setSyncingPlatform('PlayStation'); setSyncProgress(0); setSyncStats({ coins: 0, plats: 0 }); setSyncTerminal([]);
    setSyncMessage("Conectando aos servidores da Sony...");
    pushLog(`📡 Iniciando varredura na PSN para: ${savedPsnId}`);

    const listResult = await fetchPlayStationGamesList(savedPsnId);
    
    if (listResult.error || !listResult.games || !listResult.accountId || !listResult.accessToken) {
      toast.error(listResult.error || 'Erro ao comunicar com a Sony.', { theme: 'dark' });
      pushLog(`❌ Falha Crítica: ${listResult.error}`);
      setSyncingPlatform(null); return;
    }

    const games = listResult.games as TitleThin[];
    pushLog(`✅ Acesso concedido. ${games.length} jogos encontrados.`);
    let totalCoins = 0; let totalPlats = 0;

    for (let i = 0; i < games.length; i++) {
      const game = games[i];
      if (!game || game.progress === 0) continue;

      setSyncMessage(`Sincronizando: ${game.trophyTitleName} (${i + 1}/${games.length})`);
      pushLog(`> Analisando: ${game.trophyTitleName}...`);
      
      const result = await processSinglePlayStationGame(game, listResult.accountId, listResult.accessToken);
      totalCoins += result.coins; totalPlats += result.plats;
      setSyncStats({ coins: totalCoins, plats: totalPlats });
      
      if (result.coins > 0 || result.plats > 0) pushLog(`  ↳ 💰 +${result.coins} Coins | 🏆 +${result.plats} Platinas Injetadas`);
      else pushLog(`  ↳ ✔️ Sincronizado. Nenhuma nova conquista.`);

      setSyncProgress(((i + 1) / games.length) * 100);
    }

    pushLog(`🏁 Salvando totais no Cofre do Nexus...`);
    setSyncMessage("Guardando os seus troféus no Nexus...");
    await finalizeSync(totalCoins, totalPlats, 0); 

    pushLog(`✅ Sincronização PSN 100% Concluída!`);
    toast.success(`Sincronização da PSN concluída!`, { theme: 'dark' });
    setTimeout(() => { setSyncMessage(""); setSyncProgress(0); setSyncingPlatform(null); }, 3000);
  };

  const LockButton = () => (
    <button disabled className="w-full sm:w-auto px-6 py-2.5 bg-surface border border-white/5 text-gray-500 rounded-xl font-bold text-sm flex items-center justify-center gap-2 cursor-not-allowed">
      <FaLock /> Fase 2
    </button>
  );

  // Componente Reutilizável do Terminal
  const SyncExpandedArea = () => (
    <div className="w-full mt-2 bg-background/90 backdrop-blur-md p-5 rounded-2xl border border-border shadow-inner animate-in fade-in slide-in-from-top-4">
      <div className="flex justify-between text-xs font-bold mb-3 text-gray-400">
        <span className="truncate pr-4 flex items-center gap-2"><FiLoader className="animate-spin text-primary" /> {syncMessage}</span>
        <span className="text-blue-400 shrink-0">{Math.round(syncProgress)}%</span>
      </div>
      <div className="w-full bg-surface rounded-full h-3 overflow-hidden border border-white/5 mb-4">
        <div className="bg-linear-to-r from-blue-600 to-purple-500 h-full rounded-full transition-all duration-300 relative" style={{ width: `${syncProgress}%` }}>
           <div className="absolute top-0 left-0 w-full h-full bg-white/20 animate-[shimmer_2s_infinite]"></div>
        </div>
      </div>
      
      {/* 🔥 O TERMINAL DE LOGS VISUAL 🔥 */}
      <div className="bg-black/80 border border-white/10 rounded-xl p-3 h-40 overflow-y-auto font-mono text-[10px] sm:text-xs text-green-400 flex flex-col gap-1 shadow-inner custom-scrollbar" ref={terminalRef}>
        <div className="text-gray-500 flex items-center gap-2 mb-2 pb-2 border-b border-white/5"><FaTerminal /> Nexus Engine v2.0</div>
        {syncTerminal.map((log, idx) => (
          <div key={idx} className={`${log.includes('❌') ? 'text-red-400' : log.includes('💰') ? 'text-yellow-400' : log.includes('✅') ? 'text-blue-400' : 'text-green-400'}`}>
            {log}
          </div>
        ))}
      </div>

      <div className="flex justify-between mt-4 text-sm font-black border-t border-white/5 pt-3">
        <span className="text-yellow-500 flex items-center gap-1.5"><BiSolidCoinStack className="text-lg" /> +{syncStats.coins} <span className="hidden sm:inline">Nexus Coins</span></span>
        <span className="text-blue-400 flex items-center gap-1.5"><FaTrophy className="text-lg" /> +{syncStats.plats} <span className="hidden sm:inline">Platinas</span></span>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto pb-10">
      <div className="py-2 border-b border-border flex flex-col items-center text-center">
        <FaLink className="text-4xl md:text-5xl text-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)] mb-4" />
        <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">Centro de Integrações</h2>
      </div>

      <div className="grid grid-cols-1 gap-6 pt-4">
        <PlatformCard platform="Steam" title="Steam" icon={<FaSteam />} inputId={steamId} savedId={steamUsername || savedSteamId} loading={loadingSave} onInputChange={setSteamId} onSubmit={handleSaveSteam} placeholder="Ex: 76561198..." theme={{ glow: 'bg-blue-900/10 group-hover:bg-blue-800/20', iconBg: 'bg-linear-to-br from-blue-900 to-black', iconBorder: 'border-blue-500/30', btn: 'bg-white', btnHover: 'hover:bg-gray-200 text-black', tagBg: 'bg-green-500/10', tagBorder: 'border-green-500/20', tagText: 'text-green-400' }} description="Vincule a sua Steam ID64 para importar automaticamente os seus jogos." actionButton={<button onClick={handleSyncSteam} disabled={syncingPlatform !== null} className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2">{syncingPlatform === 'Steam' ? 'Sincronizando...' : 'Sincronizar Jogos'}</button>} expandedContent={syncingPlatform === 'Steam' && <SyncExpandedArea />} />

        <PlatformCard platform="PSN" title="PlayStation Network" icon={<FaPlaystation />} inputId={psnId} savedId={savedPsnId} loading={loadingPsn} onInputChange={setPsnId} onSubmit={(e) => { e.preventDefault(); handleSavePlatform('PlayStation', psnId, setLoadingPsn, setSavedPsnId); }} placeholder="Ex: cacador_psn" theme={{ glow: 'bg-blue-600/10 group-hover:bg-blue-600/20', iconBg: 'bg-linear-to-br from-blue-600 to-blue-900', iconBorder: 'border-blue-400/30', btn: 'bg-blue-600', btnHover: 'hover:bg-blue-500', tagBg: 'bg-blue-500/10', tagBorder: 'border-blue-500/20', tagText: 'text-blue-400' }} description="Vincule a sua PSN ID para importar os seus troféus." actionButton={<button onClick={handleSyncPSN} disabled={syncingPlatform !== null} className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2">{syncingPlatform === 'PlayStation' ? 'Sincronizando...' : 'Sincronizar Troféus'}</button>} expandedContent={syncingPlatform === 'PlayStation' && <SyncExpandedArea />} />

        <PlatformCard platform="Xbox" title="Xbox Live" icon={<FaXbox />} inputId={xboxId} savedId={savedXboxId} loading={loadingXbox} onInputChange={setXboxId} onSubmit={(e) => { e.preventDefault(); handleSavePlatform('Xbox', xboxId, setLoadingXbox, setSavedXboxId); }} placeholder="Ex: MasterChief" theme={{ glow: 'bg-green-600/10', iconBg: 'bg-linear-to-br from-green-500 to-green-900', iconBorder: 'border-green-400/30', btn: 'bg-green-600', btnHover: 'hover:bg-green-500', tagBg: 'bg-green-500/10', tagBorder: 'border-green-500/20', tagText: 'text-green-400' }} description="Vincule a sua Gamertag." actionButton={<LockButton />} />
        
        <PlatformCard platform="Epic" title="Epic Games" icon={<SiEpicgames />} inputId={epicId} savedId={savedEpicId} loading={loadingEpic} onInputChange={setEpicId} onSubmit={(e) => { e.preventDefault(); handleSavePlatform('Epic', epicId, setLoadingEpic, setSavedEpicId); }} placeholder="Ex: ProGamer" theme={{ glow: 'bg-gray-600/10', iconBg: 'bg-linear-to-br from-gray-500 to-gray-900', iconBorder: 'border-gray-400/30', btn: 'bg-gray-600', btnHover: 'hover:bg-gray-500', tagBg: 'bg-gray-500/10', tagBorder: 'border-gray-500/20', tagText: 'text-gray-400' }} description="Vincule a sua Epic ID." actionButton={<LockButton />} />
      </div>
    </div>
  );
}