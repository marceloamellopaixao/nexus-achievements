'use client'

import { useEffect, useRef, useState } from 'react'

export default function CustomCursor() {
  const cursorDotRef = useRef<HTMLDivElement>(null)
  const cursorRingRef = useRef<HTMLDivElement>(null)
  const [isHovering, setIsHovering] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Desativa o cursor customizado em dispositivos móveis (Touch)
    if (window.matchMedia("(pointer: coarse)").matches) return;

    let mouseX = 0;
    let mouseY = 0;
    let ringX = 0;
    let ringY = 0;

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      setIsVisible(true);

      // O JS move apenas o Wrapper (sem atraso de CSS)
      if (cursorDotRef.current) {
        cursorDotRef.current.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
      }

      // Verifica se o rato está por cima de algo clicável
      const target = e.target as HTMLElement;
      const isClickable = target.closest('a, button, input, textarea, select') !== null;
      setIsHovering(isClickable);
    };

    const onMouseLeave = () => setIsVisible(false);
    const onMouseEnter = () => setIsVisible(true);

    window.addEventListener('mousemove', onMouseMove);
    document.body.addEventListener('mouseleave', onMouseLeave);
    document.body.addEventListener('mouseenter', onMouseEnter);

    // Animação suave (Spring) para o anel exterior
    const animate = () => {
      ringX += (mouseX - ringX) * 0.15; 
      ringY += (mouseY - ringY) * 0.15;

      if (cursorRingRef.current) {
        cursorRingRef.current.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
      }
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      document.body.removeEventListener('mouseleave', onMouseLeave);
      document.body.removeEventListener('mouseenter', onMouseEnter);
    };
  }, []);

  if (typeof window !== 'undefined' && window.matchMedia("(pointer: coarse)").matches) return null;

  return (
    <>
      {/* ====================================================
          PONTO CENTRAL
          ==================================================== */}
      <div
        ref={cursorDotRef}
        // O WRAPPER: Move-se apenas por JS (Sem classes de transition-all)
        className={`fixed top-0 left-0 pointer-events-none z-9999 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        style={{ willChange: 'transform' }}
      >
        {/* O VISUAL: Perfeitamente centrado usando margens negativas */}
        <div className="relative -left-1 -top-1 w-2 h-2 bg-secondary rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]" />
      </div>
      
      {/* ====================================================
          ANEL EXTERIOR (EFEITO GLOW)
          ==================================================== */}
      <div
        ref={cursorRingRef}
        // O WRAPPER: Move-se apenas por JS
        className={`fixed top-0 left-0 pointer-events-none z-9998 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        style={{ willChange: 'transform' }}
      >
        {/* O VISUAL: Aqui sim, aplicamos as animações CSS de hover! 
            Como ele está dentro da div que o JS empurra, não há conflito. */}
        <div 
          className={`relative -left-4 -top-4 w-8 h-8 rounded-full border-2 transition-all duration-300 ease-out ${
            isHovering 
              ? 'scale-[1.5] bg-secondary/20 border-secondary/80 shadow-[0_0_20px_rgba(59,130,246,0.4)]' 
              : 'scale-100 border-secondary/40 bg-transparent'
          }`}
        />
      </div>
    </>
  )
}