'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useEffect } from 'react'

export default function GameSearch() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')

  useEffect(() => {
    // "Debounce": Espera o utilizador parar de digitar por 500ms antes de buscar
    const timeoutId = setTimeout(() => {
      if (query.trim()) {
        router.push(`/games?q=${encodeURIComponent(query.trim())}`)
      } else {
        router.push(`/games`)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [query, router])

  return (
    <div className="relative w-full max-w-md mx-auto md:mx-0">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
        <span className="text-gray-400">🔍</span>
      </div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Pesquise por um jogo..."
        className="w-full bg-surface/50 border border-border text-white rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-sm placeholder:text-gray-500"
      />
    </div>
  )
}