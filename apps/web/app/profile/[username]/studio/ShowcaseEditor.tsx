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
      {/* BARRA DE PESQUISA ESTILIZADA */}
      <div className="flex flex-col sm:flex-row gap-4 bg-background/60 p-3 rounded-3xl border border-white/5">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-500">🔍</span>
          <input
            type="text"
            placeholder="Filtrar biblioteca..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-none pl-11 pr-4 py-3 text-white text-sm font-bold focus:ring-0 placeholder:text-gray-600"
          />
        </div>
        <div className="flex items-center px-4 bg-surface/50 rounded-xl border border-white/5 shadow-inner">
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mr-3">Slots:</span>
          <span className={`text-sm font-black ${selected.length === limit ? 'text-red-400' : 'text-primary'}`}>
            {selected.length} / {limit}
          </span>
        </div>
      </div>

      {/* GRELHA DE JOGOS REFORMULADA */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5 max-h-125 overflow-y-auto custom-scrollbar p-2">
        {filteredGames.map((game) => {
          const isSelected = selected.includes(game.id);
          const slotNumber = selected.indexOf(game.id) + 1;

          return (
            <div
              key={game.id}
              onClick={() => toggleGame(game.id)}
              className={`group relative aspect-3/4 rounded-2xl overflow-hidden cursor-pointer transition-all duration-500 border-2 ${isSelected
                  ? 'border-primary shadow-[0_0_25px_rgba(59,130,246,0.5)] scale-100'
                  : 'border-white/5 grayscale hover:grayscale-0 opacity-60 hover:opacity-100 scale-95 hover:scale-100'
                }`}
            >
              {game.cover_url ? (
                <Image src={game.cover_url} alt={game.title} fill className="object-cover transition-transform duration-700 group-hover:scale-110" unoptimized />
              ) : (
                <div className="w-full h-full bg-surface flex items-center justify-center">🎮</div>
              )}

              <div className={`absolute inset-0 transition-opacity duration-300 ${isSelected ? 'bg-primary/10' : 'bg-black/40 group-hover:opacity-0'}`}></div>

              {isSelected && (
                <div className="absolute top-3 right-3 w-8 h-8 bg-white text-black text-xs font-black flex items-center justify-center rounded-xl shadow-2xl animate-in zoom-in">
                  #{slotNumber}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-10 py-4 bg-primary hover:bg-blue-500 text-white rounded-2xl font-black text-sm transition-all shadow-xl hover:shadow-primary/20 disabled:opacity-30 active:scale-95"
        >
          {saving ? 'A Processar...' : 'Confirmar Seleção'}
        </button>
      </div>
    </div>
  );
}