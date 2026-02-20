'use client'

import { useState } from 'react'
import { equipCosmetic } from './actions'
import { toast } from 'react-toastify'

type Props = {
  itemId: string;
  category: string;
  isEquipped: boolean;
}

export default function EquipButton({ itemId, category, isEquipped }: Props) {
  const [loading, setLoading] = useState(false)

  const handleEquip = async () => {
    setLoading(true)
    // Se já estiver equipado, manda 'none' para desequipar
    const actionId = isEquipped ? 'none' : itemId
    const result = await equipCosmetic(actionId, category)
    
    if (result?.error) {
      toast.error(result.error, { theme: 'dark' })
    } else {
      toast.success(isEquipped ? 'Item desequipado!' : 'Item equipado com sucesso!', { theme: 'dark' })
    }
    setLoading(false)
  }

  return (
    <button 
      onClick={handleEquip}
      disabled={loading}
      className={`w-full py-2 rounded-lg font-bold text-sm transition-all shadow-sm ${
        isEquipped 
          ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20' 
          : 'bg-primary hover:bg-primary/80 text-white'
      } disabled:opacity-50`}
    >
      {loading ? 'Aguarde...' : isEquipped ? 'Desequipar' : 'Equipar'}
    </button>
  )
}