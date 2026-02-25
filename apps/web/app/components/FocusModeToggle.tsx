'use client'

import { useFocusMode } from '@/app/contexts/FocusModeContext'
import { FaVideoSlash, FaVideo } from 'react-icons/fa'
import { toast } from 'react-toastify'
import { useEffect, useState } from 'react'

export default function FocusModeToggle() {
  const { isFocusMode, toggleFocusMode } = useFocusMode()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const handleToggle = () => {
    toggleFocusMode()
    if (!isFocusMode) {
      toast.info('Modo Streamer Ativado: Chat e sons ocultos.', { theme: 'dark', icon: <FaVideoSlash className="text-red-500" /> })
    } else {
      toast.success('Modo Streamer Desativado: Bem-vindo de volta!', { theme: 'dark', icon: <FaVideo className="text-green-500" /> })
    }
  }

  if (!mounted) return <div className="w-8 h-8 md:w-auto md:px-4 md:py-2 animate-pulse bg-surface/50 rounded-xl"></div>;

  return (
    <button
      onClick={handleToggle}
      title={isFocusMode ? "Desativar Modo Streamer" : "Ativar Modo Streamer"}
      className={`flex items-center justify-center md:justify-start gap-2 px-2.5 py-2 md:px-4 rounded-xl font-black text-[10px] md:text-xs transition-all duration-300 shadow-sm active:scale-95 ${
        isFocusMode 
          ? 'bg-red-500/10 border border-red-500/50 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]' 
          : 'bg-surface border border-white/5 text-gray-400 hover:text-white hover:bg-white/10'
      }`}
    >
      {isFocusMode ? <FaVideoSlash className="text-sm md:text-base animate-pulse drop-shadow-md" /> : <FaVideo className="text-sm md:text-base" />}
      <span className="hidden md:inline uppercase tracking-widest">{isFocusMode ? 'Streamer ON' : 'Streamer OFF'}</span>
    </button>
  )
}