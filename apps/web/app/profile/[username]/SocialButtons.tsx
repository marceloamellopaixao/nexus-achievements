'use client'

import { useState } from 'react'
import { toggleFollow } from './actions'
import { toast } from 'react-toastify'

type Props = {
  targetId: string;
  initialIsFollowing: boolean;
  currentPath: string;
}

export default function SocialButtons({ targetId, initialIsFollowing, currentPath }: Props) {
  const [loading, setLoading] = useState(false)

  const handleToggle = async () => {
    setLoading(true)
    const res = await toggleFollow(targetId, currentPath)
    
    if (res?.error) {
      toast.error(res.error, { theme: 'dark' })
    } else {
      toast.success(initialIsFollowing ? 'Deixou de seguir.' : 'Agora você segue este caçador!', { 
        theme: 'dark',
        icon: initialIsFollowing ? <span>👋</span> : <span>🤝</span>})
    }
    setLoading(false)
  }

  return (
    <div className="flex items-center gap-3 w-full md:w-auto">
      
      {/* Botão de Seguir / Deixar de Seguir */}
      <button 
        onClick={handleToggle} 
        disabled={loading}
        className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-black text-sm transition-all duration-300 shadow-md active:scale-95 disabled:opacity-50 ${
          initialIsFollowing 
            ? 'bg-surface/50 border border-border text-gray-300 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/30' 
            : 'bg-primary border border-primary text-white hover:bg-primary/80 hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]'
        }`}
      >
        {loading ? (
          <span className="animate-spin text-lg">🔄</span>
        ) : initialIsFollowing ? (
          <span className="text-lg">❌</span>
        ) : (
          <span className="text-lg">🤝</span>
        )}
        {loading ? 'Aguarde...' : initialIsFollowing ? 'Deixar de Seguir' : 'Seguir Caçador'}
      </button>
    </div>
  )
}