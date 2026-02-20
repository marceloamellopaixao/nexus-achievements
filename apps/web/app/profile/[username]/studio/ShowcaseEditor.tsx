'use client'

import React, { useState } from 'react'
import { toast } from 'react-toastify'
import { updateShowcase } from './actions'
import Image from 'next/image'

type Game = {
  id: string;
  title: string;
  cover_url: string;
}

type Props = {
  availableGames: Game[];
  initialShowcase: string[];
}

export default function ShowcaseEditor({ availableGames, initialShowcase }: Props) {
  const [selected, setSelected] = useState<string[]>(initialShowcase || [])
  const [saving, setSaving] = useState(false)

  const toggleGame = (gameId: string) => {
    if (selected.includes(gameId)) {
      setSelected(selected.filter(id => id !== gameId))
    } else {
      if (selected.length >= 5) {
        toast.warning("Você só pode fixar até 5 jogos!", { theme: 'dark' })
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
      toast.success("Estante atualizada com sucesso!", { theme: 'dark', icon: () => <span>🏆</span> })
    }
    setSaving(false)
  }

  return (
    <div className="space-y-6 bg-surface/30 border border-border p-6 rounded-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-white">🏆 Estante de Troféus</h3>
          <p className="text-sm text-gray-400 mt-1">Selecione até 5 jogos para exibir no seu perfil público.</p>
        </div>
        <span className="bg-background border border-border px-3 py-1 rounded-md text-xs font-bold text-primary">
          {selected.length} / 5 Slots
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {availableGames.map((game) => {
          const isSelected = selected.includes(game.id)
          const slotNumber = selected.indexOf(game.id) + 1

          return (
            <div 
              key={game.id} 
              onClick={() => toggleGame(game.id)}
              className={`relative aspect-3/4 rounded-xl overflow-hidden cursor-pointer transition-all border-2 ${
                isSelected ? 'border-primary shadow-[0_0_15px_rgba(59,130,246,0.3)] scale-105 z-10' : 'border-transparent hover:border-border'
              }`}
            >
              <Image src={game.cover_url} alt={game.title} fill className="object-cover" />
              <div className="absolute inset-0 bg-black/40 hover:bg-transparent transition-colors"></div>
              
              {isSelected && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-primary text-white text-xs font-black flex items-center justify-center rounded-full shadow-lg">
                  {slotNumber}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex justify-end pt-4 border-t border-border/50">
        <button 
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 bg-primary text-white font-bold rounded-lg hover:bg-primary/80 transition-colors disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar Estante'}
        </button>
      </div>
    </div>
  )
}