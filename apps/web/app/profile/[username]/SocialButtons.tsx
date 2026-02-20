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
    if (res.error) toast.error(res.error, { theme: 'dark' })
    setLoading(false)
  }

  return (
    <>
      <button 
        onClick={handleToggle} 
        disabled={loading}
        className={`flex-1 md:flex-none text-center px-6 py-2.5 rounded-lg font-bold text-sm transition-colors shadow-sm disabled:opacity-50 ${
          initialIsFollowing 
            ? 'bg-surface border border-border text-white hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/50' 
            : 'bg-primary text-white hover:bg-primary/80'
        }`}
      >
        {loading ? '...' : initialIsFollowing ? 'Deixar de Seguir' : '+ Seguir'}
      </button>
      <button className="text-center px-4 py-2.5 bg-surface border border-border text-white hover:bg-surface/80 rounded-lg font-bold text-sm transition-colors shadow-sm">
        ⚔️ Desafiar
      </button>
    </>
  )
}