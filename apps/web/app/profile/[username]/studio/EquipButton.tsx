'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { equipCosmetic } from './actions'
import { toast } from 'react-toastify'

type Props = {
  itemId: string;
  category: string;
  isEquipped: boolean;
}

export default function EquipButton({ itemId, category, isEquipped }: Props) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleEquip = async () => {
    setLoading(true)

    // Se já estiver equipado, manda 'none' para desequipar
    const actionId = isEquipped ? 'none' : itemId
    const result = await equipCosmetic(actionId, category)

    if (result?.error) {
      toast.error(result.error, { theme: 'dark' })
    } else {
      toast.success(isEquipped ? '🗑️ Cosmético removido!' : '✨ Cosmético equipado com sucesso!', {
        theme: 'dark'
      })
      router.refresh()
    }

    setLoading(false)
  }

  return (
    <button
      onClick={handleEquip}
      disabled={loading}
      className={`w-full py-2.5 px-4 rounded-xl font-black text-xs md:text-sm transition-all duration-300 flex items-center justify-center gap-2 shadow-sm active:scale-95 disabled:opacity-50 disabled:pointer-events-none ${isEquipped
          ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/40'
          : 'bg-primary/10 text-primary border border-primary/30 hover:bg-primary hover:text-white hover:shadow-[0_0_15px_rgba(59,130,246,0.4)]'
        }`}
    >
      {loading ? (
        <>
          <span className="animate-spin text-base">🔄</span> Aguarde...
        </>
      ) : isEquipped ? (
        <>
          <span className="text-base">❌</span> Remover
        </>
      ) : (
        <>
          <span className="text-base">✨</span> Equipar
        </>
      )}
    </button>
  )
}