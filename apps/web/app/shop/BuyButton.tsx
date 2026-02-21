'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { purchaseItem } from './actions'
import { toast } from 'react-toastify'

type BuyButtonProps = {
    itemId: string;
    price: number;
}

export default function BuyButton({ itemId, price }: BuyButtonProps) {
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleBuy = async () => {
        setLoading(true)

        const result = await purchaseItem(itemId, price)

        if (result?.error) {
            toast.error(result.error, { theme: 'dark' })
        } else if (result?.success) {
            toast.success(result.message, { 
                theme: 'dark', 
                icon: () => <span className="text-xl">💎</span> 
            })
            // Atualiza a página para refletir o novo saldo e o inventário
            router.refresh()
        }

        setLoading(false)
    }

    return (
        <button
            onClick={handleBuy}
            disabled={loading}
            className="w-full py-3 bg-primary/10 text-primary border border-primary/30 hover:bg-primary hover:text-white rounded-xl font-black text-sm transition-all duration-300 flex items-center justify-center gap-3 shadow-lg hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] disabled:opacity-50 active:scale-95 group"
        >
            {loading ? (
                <>
                    <span className="animate-spin text-lg">🔄</span>
                    <span>Processando...</span>
                </>
            ) : (
                <>
                    <span className="text-lg group-hover:scale-110 transition-transform">🪙</span>
                    <span>{price.toLocaleString()}</span>
                    <span className="opacity-50 font-medium">|</span>
                    <span>Comprar</span>
                </>
            )}
        </button>
    )
}