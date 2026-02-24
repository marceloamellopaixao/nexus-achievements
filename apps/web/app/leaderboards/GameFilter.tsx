'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useMemo } from 'react'
import { FaSearch, FaGlobeAmericas } from 'react-icons/fa'

type Game = {
  id: string;
  title: string;
}

export default function GameFilter({ games }: { games: Game[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const currentGameId = searchParams.get('gameId') || ''
  const currentSort = searchParams.get('sort') || 'platinums'

  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const filteredGames = useMemo(() => {
    if (!query) return games.slice(0, 50);
    return games
      .filter(g => g.title.toLowerCase().includes(query.toLowerCase()))
      .slice(0, 50);
  }, [query, games]);

  const handleSelect = (gameId: string) => {
    setQuery('')
    setIsOpen(false)
    router.push(`/leaderboards?gameId=${gameId}`)
  }

  const goToGlobal = () => {
    setQuery('')
    router.push(`/leaderboards?sort=${currentSort}`)
  }

  return (
    <div className="flex flex-col md:flex-row items-center gap-4 w-full max-w-2xl mx-auto relative z-50">
      
      {/* Barra de Pesquisa */}
      <div className="relative w-full">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <FaSearch className="text-gray-400" />
        </div>
        <input
          type="text"
          className="w-full bg-surface/80 backdrop-blur-md border border-white/5 text-white rounded-xl pl-11 pr-4 py-3.5 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-inner placeholder:text-gray-500 font-medium text-sm md:text-base"
          placeholder="Pesquise um jogo para ver o ranking..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)} 
        />
        
        {/* Dropdown de Resultados */}
        {isOpen && (
          <div className="absolute top-full mt-2 w-full bg-surface/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl max-h-64 overflow-y-auto custom-scrollbar z-50 flex flex-col p-2">
            {filteredGames.length === 0 ? (
              <div className="px-4 py-6 text-sm text-gray-500 text-center font-bold">Nenhum jogo encontrado.</div>
            ) : (
              filteredGames.map(g => (
                <button
                  key={g.id}
                  onClick={() => handleSelect(g.id)}
                  className="flex items-center text-left px-4 py-3 text-sm font-bold text-gray-300 hover:bg-primary/20 hover:text-white rounded-lg transition-colors truncate w-full"
                >
                  {g.title}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Botão de Retorno Global */}
      {currentGameId && (
        <button 
          onClick={goToGlobal}
          className="shrink-0 w-full md:w-auto px-6 py-3.5 bg-background border border-white/10 text-white hover:bg-white/5 hover:border-white/20 rounded-xl font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2"
        >
          <FaGlobeAmericas className="text-primary text-lg" /> Ver Global
        </button>
      )}
    </div>
  )
}