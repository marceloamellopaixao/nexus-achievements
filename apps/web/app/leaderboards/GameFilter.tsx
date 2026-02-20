'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useMemo } from 'react'

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

  // Filtra os jogos baseado no que o utilizador digitou. 
  // Limitamos a 50 resultados para a lista não causar lag.
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
      
      {/* Barra de Pesquisa Auto-Complete */}
      <div className="relative w-full">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <span className="text-gray-400">🔍</span>
        </div>
        <input
          type="text"
          className="w-full bg-surface border border-border text-white rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-md placeholder:text-gray-500 font-medium"
          placeholder="Pesquise um jogo para ver o ranking..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          // O timeout garante que dá tempo do onClick do botão da lista disparar antes do menu fechar
          onBlur={() => setTimeout(() => setIsOpen(false), 200)} 
        />
        
        {/* Dropdown Flutuante de Resultados */}
        {isOpen && (
          <div className="absolute top-full mt-2 w-full bg-surface border border-border rounded-xl shadow-2xl max-h-64 overflow-y-auto custom-scrollbar z-50 flex flex-col p-1">
            {filteredGames.length === 0 ? (
              <div className="px-4 py-4 text-sm text-gray-500 text-center font-medium">Nenhum jogo encontrado.</div>
            ) : (
              filteredGames.map(g => (
                <button
                  key={g.id}
                  onClick={() => handleSelect(g.id)}
                  className="flex items-center text-left px-4 py-4 text-sm font-bold text-gray-300 hover:bg-primary/20 hover:text-white rounded-lg transition-colors truncate"
                >
                  {g.title}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Botão de Retorno Global (Só aparece se estiver a ver um jogo) */}
      {currentGameId && (
        <button 
          onClick={goToGlobal}
          className="shrink-0 w-full md:w-auto px-6 py-3 bg-background border border-border text-white hover:bg-surface hover:text-primary rounded-xl font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2"
        >
          🌍 Ver Global
        </button>
      )}
    </div>
  )
}