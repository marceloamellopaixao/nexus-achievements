'use client'

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface GameCardImageProps {
  src?: string | null;
  title: string;
  isBanner?: boolean; // Se for true, usa proporção horizontal, false usa vertical
}

export default function GameCardImage({ src, title, isBanner = false }: GameCardImageProps) {
  const [error, setError] = useState(false);

  // Se o src mudar (por exemplo, ao trocar de jogo), resetamos o erro para tentar carregar a nova imagem
  useEffect(() => {
    setError(false);
  }, [src]);

  const hasImage = src && src.trim() !== '' && !error;

  if (!hasImage) {
    return (
      <div className={`w-full h-full relative flex items-center justify-center overflow-hidden bg-linear-to-br from-surface to-background border border-white/5`}>
        {/* Pattern de fundo sutil com o nome do jogo */}
        <div className="absolute inset-0 opacity-10 pointer-events-none select-none overflow-hidden flex flex-wrap gap-4 p-4 text-[10px] font-black uppercase tracking-widest leading-none">
          {Array(20).fill(title).map((t, i) => <span key={i}>{t}</span>)}
        </div>

        {/* Branding Nexus no Centro */}
        <div className="relative z-10 flex flex-col items-center gap-2 p-4 text-center">
          <span className={`${isBanner ? 'text-4xl' : 'text-6xl'} opacity-20 filter grayscale`}>🎮</span>
          <div className="px-2 py-0.5 bg-primary/20 border border-primary/30 rounded text-[8px] font-black text-primary uppercase tracking-[0.2em]">
            Nexus Achievements
          </div>
        </div>
        
        {/* Glow de canto para dar profundidade */}
        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-primary/10 blur-3xl rounded-full"></div>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={title}
      fill
      className="object-cover group-hover:scale-105 transition-transform duration-500"
      sizes={isBanner ? "100vw" : "(max-width: 768px) 50vw, (max-width: 1300px) 25vw, 16vw"}
      onError={() => setError(true)}
      unoptimized
    />
  );
}