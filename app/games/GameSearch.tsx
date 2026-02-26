'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useState, useRef } from 'react'
import { FaSearch } from "react-icons/fa";

export default function GameSearch() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  // Estado local para o input
  const [query, setQuery] = useState(searchParams.get('q') || '')
  
  // Guardamos o temporizador do debounce aqui, fora do ciclo do React
  const debounceTimer = useRef<NodeJS.Timeout | null>(null)

  const handleSearch = (value: string) => {
    setQuery(value)

    // Limpa o temporizador antigo se o utilizador continuar a digitar
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    // Define um novo temporizador
    debounceTimer.current = setTimeout(() => {
      // Pega nos parâmetros ATUAIS (ex: platform=PlayStation)
      const params = new URLSearchParams(searchParams.toString())
      
      if (value.trim()) {
        params.set('q', value.trim())
      } else {
        params.delete('q')
      }
      
      // Só apagamos a página quando o utilizador de facto altera a pesquisa!
      params.delete('page')

      // Faz o push para a nova URL
      router.push(`${pathname}?${params.toString()}`)
    }, 500)
  }

  return (
    <div className="relative w-full">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
        <FaSearch className="text-gray-400" />
      </div>
      <input
        type="text"
        value={query}
        onChange={(e) => handleSearch(e.target.value)} // Dispara apenas por ação humana!
        placeholder="Pesquise por um jogo..."
        className="w-full bg-background/50 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-sm text-white focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all shadow-inner placeholder:text-gray-500"
      />
    </div>
  )
}