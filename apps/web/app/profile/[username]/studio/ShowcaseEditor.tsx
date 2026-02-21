'use client'

import React, { useState, useMemo } from 'react'
import { toast } from 'react-toastify'
import { updateShowcase } from './actions'
import Image from 'next/image'

type Game = {
  id: string;
  title: string;
  cover_url: string | null; 
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

  // Filtra os jogos com base na pesquisa. Mostra apenas os primeiros 60 jogos para evitar travamentos.
  const filteredGames = useMemo(() => {
    return availableGames
      .filter(game => game.title.toLowerCase().includes(searchQuery.toLowerCase()))
      .slice(0, 60); 
  }, [availableGames, searchQuery]);

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
      toast.success("Estante atualizada com sucesso!", { theme: 'dark', icon: <span>🏆</span> })
    }
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      
      {/* Cabeçalho da Editor de Estante */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-background/40 p-4 rounded-2xl border border-border/50">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">🔍</span>
          <input 
            type="text" 
            placeholder="Pesquise o jogo que deseja exibir..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary transition-colors"
          />
        </div>
        <div className="flex items-center gap-4 shrink-0 px-2 sm:px-0">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            Espaços Livres:
          </span>
          <span className={`px-4 py-1.5 rounded-lg text-sm font-black border shadow-inner ${selected.length === limit ? 'bg-red-500/20 text-red-500 border-red-500/30' : 'bg-primary/20 text-primary border-primary/30'}`}>
            {selected.length} / {limit}
          </span>
        </div>
      </div>

      {/* GRELHA DE JOGOS (Com Rolagem / Scroll Limitado) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 max-h-125 overflow-y-auto custom-scrollbar pr-2 p-2 -ml-2">
        {filteredGames.length === 0 ? (
          <div className="col-span-full py-16 text-center text-gray-500">
            Nenhum jogo encontrado com esse nome.
          </div>
        ) : (
          filteredGames.map((game) => {
            const isSelected = selected.includes(game.id)
            const slotNumber = selected.indexOf(game.id) + 1
            const hasCover = typeof game.cover_url === 'string' && game.cover_url.trim() !== '';

            return (
              <div 
                key={game.id} 
                onClick={() => toggleGame(game.id)}
                className={`relative aspect-3/4 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 border-[3px] group ${
                  isSelected ? 'border-primary shadow-[0_0_20px_rgba(59,130,246,0.4)] scale-100 z-10' : 'border-transparent hover:border-border scale-95 hover:scale-100'
                }`}
              >
                {/* Capa do Jogo Seguro */}
                {hasCover ? (
                  <Image src={game.cover_url as string} alt={game.title} fill sizes="(max-width: 768px) 50vw, 20vw" className="object-cover transition-transform duration-700 group-hover:scale-110" unoptimized />
                ) : (
                  <div className="absolute inset-0 w-full h-full bg-background flex flex-col items-center justify-center p-3 text-center border border-dashed border-border/50">
                    <span className="text-3xl mb-2 opacity-50">🎮</span>
                    <span className="text-[10px] font-bold text-gray-400 leading-tight">{game.title}</span>
                  </div>
                )}
                
                {/* Efeito Hover Escurecido */}
                <div className={`absolute inset-0 transition-colors duration-300 ${isSelected ? 'bg-transparent' : 'bg-black/50 group-hover:bg-black/10'}`}></div>
                
                {/* Badge Numerado de Seleção */}
                {isSelected && (
                  <div className="absolute top-2 right-2 w-7 h-7 bg-primary text-white text-sm font-black flex items-center justify-center rounded-lg shadow-lg border border-white/20">
                    {slotNumber}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <div className="flex justify-end pt-4 border-t border-white/5">
        <button 
          onClick={handleSave}
          disabled={saving || selected.length === 0}
          className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/80 text-white rounded-xl px-8 py-3.5 font-black text-sm transition-all shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
        >
          {saving ? 'A guardar...' : 'Guardar Nova Estante'}
        </button>
      </div>
    </div>
  )
}