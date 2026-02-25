'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { toast } from 'react-toastify'
import { updateShowcase } from './actions'
import Image from 'next/image'
import { FaSearch, FaGamepad, FaTrophy, FaClock, FaFire } from 'react-icons/fa' 

// 🔥 ADICIONADO: Novos tipos para a carta 3D no editor
type Game = {
  id: string;
  title: string;
  cover_url: string | null;
  is_platinum: boolean;
  unlocked_achievements: number;
  total_achievements: number;
  playtime_minutes: number;
}

type Props = {
  availableGames: Game[];
  initialShowcase: string[];
  limit: number;
}

export default function ShowcaseEditor({ availableGames, initialShowcase, limit }: Props) {
  const [selected, setSelected] = useState<string[]>(initialShowcase || [])
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  
  const [currentPage, setCurrentPage] = useState(1)
  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const filteredGames = useMemo(() => {
    return availableGames.filter(game => game.title.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [availableGames, searchQuery]);

  const totalPages = Math.ceil(filteredGames.length / ITEMS_PER_PAGE) || 1;
  const paginatedGames = filteredGames.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const toggleGame = (gameId: string) => {
    if (selected.includes(gameId)) {
      setSelected(selected.filter(id => id !== gameId))
    } else {
      if (selected.length >= limit) {
        toast.warning(`Só pode exibir até ${limit} jogos!`, { theme: 'dark' })
        return;
      }
      setSelected([...selected, gameId])
    }
  }

  const handleSave = async () => {
    setSaving(true)
    const result = await updateShowcase(selected)
    if (result.error) {
      toast.error(result.error, { theme: 'dark' })
    } else {
      toast.success("Estante atualizada com sucesso!", { theme: 'dark', icon: <FaTrophy className="text-yellow-500" /> })
    }
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 bg-background/60 p-3 rounded-3xl border border-white/5">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-500">
            <FaSearch />
          </span>
          <input
            type="text"
            placeholder="Filtrar biblioteca..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-none pl-11 pr-4 py-3 text-white text-sm font-bold focus:ring-0 placeholder:text-gray-600 outline-none"
          />
        </div>
        <div className="flex items-center px-4 bg-surface/50 rounded-xl border border-white/5 shadow-inner shrink-0">
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mr-3">Slots:</span>
          <span className={`text-sm font-black ${selected.length === limit ? 'text-red-400' : 'text-primary'}`}>
            {selected.length} / {limit}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-5 min-h-75 p-2">
        {paginatedGames.map((game) => {
          const isSelected = selected.includes(game.id);
          const slotNumber = selected.indexOf(game.id) + 1;

          // Processamento dos Dados da Carta
          const unlocked = game.unlocked_achievements || 0;
          const total = game.total_achievements || 0;
          const pct = total > 0 ? Math.round((unlocked / total) * 100) : 0;
          const isPlat = game.is_platinum;
          const hours = Math.floor((game.playtime_minutes || 0) / 60);

          let rarityText = "Iniciante";
          let rarityColor = "text-gray-400";
          if (isPlat) { rarityText = "Lenda"; rarityColor = "text-cyan-400"; }
          else if (pct >= 80) { rarityText = "Épico"; rarityColor = "text-purple-400"; }
          else if (pct >= 40) { rarityText = "Veterano"; rarityColor = "text-primary"; }
          else if (pct > 0) { rarityText = "Ativo"; rarityColor = "text-green-400"; }

          return (
            <div
              key={game.id}
              onClick={() => toggleGame(game.id)}
              className={`group relative aspect-3/4 rounded-2xl cursor-pointer transition-all duration-300 ${
                isSelected ? 'scale-105 z-10' : 'grayscale opacity-60 hover:grayscale-0 hover:opacity-100 hover:scale-100'
              }`}
              style={{ perspective: '1500px' }}
            >
              {/* O Container 3D */}
              <div 
                className="relative w-full h-full transition-transform duration-700 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] rounded-2xl group-hover:transform-[rotateY(-180deg)] shadow-lg"
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* === FRENTE === */}
                <div className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden bg-surface border border-white/5" style={{ backfaceVisibility: 'hidden' }}>
                  {game.cover_url ? (
                    <Image src={game.cover_url} alt={game.title} fill className="object-cover" unoptimized />
                  ) : (
                    <div className="w-full h-full bg-surface flex items-center justify-center text-gray-500 text-3xl"><FaGamepad /></div>
                  )}
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-background via-background/80 to-transparent z-10 pointer-events-none"></div>
                  <div className="absolute inset-x-0 bottom-0 p-3 z-20 flex flex-col justify-end">
                    <h3 className="font-black text-white text-[10px] md:text-xs line-clamp-2 drop-shadow-md leading-tight group-hover:text-primary transition-colors">
                      {game.title}
                    </h3>
                    {unlocked > 0 && !isPlat && (
                       <div className="mt-1.5 w-full h-1 bg-black/60 rounded-full overflow-hidden border border-white/5"><div className="h-full bg-primary" style={{ width: `${pct}%` }}></div></div>
                    )}
                    {isPlat && (
                       <div className="mt-1.5 w-full h-1 bg-cyan-400 rounded-full shadow-[0_0_8px_cyan]"></div>
                    )}
                  </div>
                </div>

                {/* === VERSO (Físico 3D) === */}
                <div 
                  className={`absolute inset-0 w-full h-full rounded-2xl overflow-hidden flex flex-col text-center bg-surface border-2 ${isPlat ? 'border-cyan-500/50' : 'border-white/10'}`}
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                >
                  {game.cover_url && (
                    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                      <Image src={game.cover_url} fill alt="" className="object-cover opacity-30 blur-2xl scale-125" unoptimized />
                      <div className="absolute inset-0 bg-background/80 mix-blend-overlay"></div>
                    </div>
                  )}
                  {isPlat && (
                    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden rounded-2xl">
                      <div className="absolute -inset-[200%] bg-linear-to-tr from-transparent via-cyan-400/20 to-transparent animate-[shimmer_3s_infinite_linear] rotate-45"></div>
                      <FaTrophy className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[100px] text-cyan-400 opacity-10 drop-shadow-[0_0_20px_cyan]" />
                    </div>
                  )}

                  <div className="relative z-10 w-full px-2 pt-3 pb-1 min-h-10 flex items-center justify-center shrink-0">
                    <h4 className="font-black text-white text-[9px] md:text-[10px] line-clamp-2 w-full drop-shadow-md leading-tight">{game.title}</h4>
                  </div>
                  
                  <div className="relative z-10 flex flex-col items-center justify-center flex-1 w-full px-2 overflow-hidden">
                    <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center mb-1.5 relative overflow-hidden shrink-0 ${isPlat ? 'bg-cyan-900/40 border border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]' : 'bg-surface/80 border border-white/10 shadow-inner'}`}>
                       {isPlat ? <FaTrophy className="text-sm md:text-base text-cyan-400 animate-pulse drop-shadow-md" /> : <FaGamepad className="text-sm md:text-base text-gray-400" />}
                    </div>
                    <p className="text-[6px] md:text-[7px] font-black uppercase tracking-widest text-gray-400 mb-0.5 shrink-0">Conquistas</p>
                    <p className={`text-sm md:text-base font-black leading-none tracking-tight drop-shadow-lg shrink-0 ${isPlat ? 'text-cyan-400' : 'text-white'}`}>
                       {unlocked} <span className="text-[8px] md:text-[9px] text-gray-400 font-bold">/ {total}</span>
                    </p>
                    <div className="w-full max-w-[70%] mt-1.5 bg-black/60 h-1.5 rounded-full overflow-hidden border border-white/10 shadow-inner shrink-0">
                      <div className={`h-full transition-all duration-1000 relative ${isPlat ? 'bg-cyan-400 shadow-[0_0_10px_cyan]' : 'bg-primary'}`} style={{ width: `${pct}%` }}>
                         {isPlat && <div className="absolute inset-0 bg-white/30 animate-pulse"></div>}
                      </div>
                    </div>
                    <p className="text-[7px] md:text-[8px] mt-1 font-bold text-gray-400 uppercase tracking-widest shrink-0">{pct}%</p>
                  </div>

                  <div className="relative z-10 w-full flex items-center justify-between border-t border-white/10 bg-black/40 backdrop-blur-sm px-2 py-1.5 mt-auto shrink-0">
                    <div className="flex flex-col items-center flex-1">
                      <FaClock className="text-gray-500 mb-0.5 text-[8px]" />
                      <span className="text-[8px] font-black text-white">{hours}h</span>
                    </div>
                    <div className="w-px h-4 bg-white/10"></div>
                    <div className="flex flex-col items-center flex-1">
                      <FaFire className={`${rarityColor} mb-0.5 text-[8px] drop-shadow-md`} />
                      <span className={`text-[7px] font-black ${rarityColor} uppercase tracking-wider`}>{rarityText}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Borda de Seleção externa (Fora do contentor 3D para não rodar) */}
              <div className={`absolute inset-0 rounded-2xl border-2 pointer-events-none transition-all duration-300 ${isSelected ? 'border-primary shadow-[0_0_25px_rgba(59,130,246,0.5)]' : 'border-transparent'}`}></div>
              
              {/* Overlays de Seleção Estáticos */}
              {isSelected && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-primary text-white text-[10px] font-black flex items-center justify-center rounded-lg shadow-2xl animate-in zoom-in z-30 border border-white/20">
                  #{slotNumber}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* 🔥 CONTROLOS DE PAGINAÇÃO DA ESTANTE */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-white/5 pt-4">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-surface/50 border border-white/10 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-30 disabled:pointer-events-none hover:bg-white/5"
          >
            Anterior
          </button>
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest bg-background px-3 py-1.5 rounded-lg border border-white/5">
            Página {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-surface/50 border border-white/10 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-30 disabled:pointer-events-none hover:bg-white/5"
          >
            Próxima
          </button>
        </div>
      )}

      <div className="flex justify-end pt-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-10 py-4 bg-primary hover:bg-blue-500 text-white rounded-2xl font-black text-sm transition-all shadow-xl hover:shadow-primary/20 disabled:opacity-30 active:scale-95 flex items-center gap-2"
        >
          {saving ? 'A Processar...' : 'Confirmar Seleção'}
        </button>
      </div>
    </div>
  );
}