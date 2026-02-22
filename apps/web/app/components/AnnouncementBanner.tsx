'use client'

import { useState } from 'react'
import { IoClose } from 'react-icons/io5'

interface Props {
  message: string
  type: string
}

export default function AnnouncementBanner({ message, type }: Props) {
  const [isVisible, setIsVisible] = useState(true)

  if (!isVisible) return null

  const getStyle = () => {
    switch (type) {
      case 'event': return 'bg-linear-to-r from-purple-600 via-blue-600 to-purple-600 text-white shadow-[0_0_20px_rgba(147,51,234,0.3)]'
      case 'warning': return 'bg-red-500 text-white'
      default: return 'bg-primary text-white'
    }
  }

  return (
    <div className={`relative h-10 shrink-0 flex items-center justify-center px-10 text-[10px] font-black uppercase tracking-[0.2em] animate-in slide-in-from-top duration-500 z-50 ${getStyle()}`}>
      <span className="mr-2 hidden sm:inline">{type === 'event' ? '🔥 EVENTO:' : '📢 AVISO:'}</span>
      <span className="truncate">{message}</span>
      
      <button 
        onClick={() => setIsVisible(false)}
        className="absolute right-2 p-1 hover:bg-black/10 rounded-full transition-colors"
      >
        <IoClose size={18} />
      </button>
    </div>
  )
}