'use client'

import { useState, useEffect } from 'react'
import { toggleFollow } from './actions'
import { toast } from 'react-toastify'

type Props = {
  targetId: string;
  initialIsFollowing: boolean;
  currentPath: string;
}

export default function SocialButtons({ targetId, initialIsFollowing, currentPath }: Props) {
  const [loading, setLoading] = useState(false)
  // Estado local para mudança visual instantânea sem recarregar a página
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing)

  // Sincroniza se vier mudança do servidor (como ao trocar de página)
  useEffect(() => {
    setIsFollowing(initialIsFollowing);
  }, [initialIsFollowing]);

  const handleToggle = async () => {
    if (loading) return;
    setLoading(true)
    
    const res = await toggleFollow(targetId, currentPath)
    
    if (res?.error) {
      toast.error(res.error, { theme: 'dark' })
    } else {
      const newState = res.isNowFollowing ?? false;
      
      setIsFollowing(newState);
      
      toast.success(newState ? 'Agora você segue este caçador!' : 'Deixou de seguir.', { 
        theme: 'dark',
        icon: newState ? <span>🤝</span> : <span>👋</span>
      })
    }
    setLoading(false)
  }

  return (
    <div className="flex items-center gap-3 w-full md:w-auto">
      <button 
        onClick={handleToggle} 
        disabled={loading}
        className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-black text-sm transition-all duration-300 shadow-md active:scale-95 disabled:opacity-50 ${
          isFollowing 
            ? 'bg-surface/50 border border-border text-gray-300 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30' 
            : 'bg-primary border border-primary text-white hover:bg-primary/80 hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]'
        }`}
      >
        {loading ? (
          <span className="animate-spin text-lg">🔄</span>
        ) : isFollowing ? (
          <span className="text-lg">❌</span>
        ) : (
          <span className="text-lg">🤝</span>
        )}
        {loading ? 'Aguarde...' : isFollowing ? 'Deixar de Seguir' : 'Seguir Caçador'}
      </button>
    </div>
  )
}