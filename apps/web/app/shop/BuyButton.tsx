'use client'

import { useState } from 'react'
import { purchaseItem } from './actions'
import { toast } from 'react-toastify'

type BuyButtonProps = {
  itemId: string;
  price: number;
}

export default function BuyButton({ itemId, price }: BuyButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleBuy = async () => {
    setLoading(true)
    
    // Chama a nossa Server Action
    const result = await purchaseItem(itemId, price)
    
    if (result?.error) {
      toast.error(result.error, { theme: 'dark' })
    } else if (result?.success) {
      toast.success(result.message, { theme: 'dark', icon: '🎉' })
    }
    
    setLoading(false)
  }

  return (
    <button 
      onClick={handleBuy}
      disabled={loading}
      className="w-full py-2.5 bg-primary hover:bg-primary/80 text-white rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50"
    >
      <span>🪙 {price.toLocaleString()}</span>
      <span>{loading ? 'Processando...' : 'Comprar'}</span>
    </button>
  )
}