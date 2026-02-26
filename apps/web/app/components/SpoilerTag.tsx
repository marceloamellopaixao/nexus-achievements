'use client'

import { useState } from 'react'
import { FaEyeSlash, FaEye } from 'react-icons/fa'

export default function SpoilerTag({ text }: { text: string }) {
  const [revealed, setRevealed] = useState(false)

  return (
    <span 
      onClick={() => setRevealed(true)}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 mx-1 rounded cursor-pointer transition-all duration-300 shadow-sm ${
        revealed 
          ? 'bg-white/10 text-white border border-white/20' 
          : 'bg-black border border-white/5 text-transparent hover:bg-gray-900 select-none'
      }`}
      title={revealed ? "" : "Clique para revelar o spoiler"}
    >
      {revealed ? (
        <FaEye className="text-gray-400 text-[10px] shrink-0" />
      ) : (
        <FaEyeSlash className="text-gray-500 text-[10px] shrink-0" />
      )}
      {/* Usamos opacity em vez de esconder para manter o tamanho exato da frase no layout! */}
      <span className={`transition-opacity duration-500 ${revealed ? 'opacity-100' : 'opacity-0'}`}>
        {text}
      </span>
    </span>
  )
}