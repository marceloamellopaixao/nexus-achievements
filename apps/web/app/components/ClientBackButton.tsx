'use client'

import Link from "next/link";
import { FaArrowLeft } from "react-icons/fa";

type ClientBackButtonProps = {
  title?: string;
  href: string; // Ex: /games?page=2&category=Ação
  className?: string;
};

export default function ClientBackButton({ title, href, className }: ClientBackButtonProps) {
  // A classe do botão flutuante
  const defaultClass = "absolute top-4 left-4 md:top-8 md:left-8 z-10 inline-flex items-center gap-2 px-4 py-2 bg-background/40 backdrop-blur-md border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 rounded-xl font-bold text-sm transition-all shadow-lg active:scale-95 cursor-pointer";

  return (
    // Usamos o componente nativo Link para navegação instantânea e cacheada!
    <Link href={href} className={className || defaultClass} prefetch={true}>
      <FaArrowLeft />
      {title || <span>Voltar</span>}
    </Link>
  );
}