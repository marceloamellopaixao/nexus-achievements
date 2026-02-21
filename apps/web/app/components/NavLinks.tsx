'use client'

import Link from "next/link";
import { usePathname } from "next/navigation";

// Interface para as propriedades dos links
type NavLinkType = {
  href: string;
  icon: string | React.ReactNode;
  label: string;
  mobile: boolean;
};

export function DesktopNavLinks({ links }: { links: NavLinkType[] }) {
  const pathname = usePathname();

  return (
    <>
      {links.map((link) => {
        // Verifica se a rota atual bate com o link (mantém aceso mesmo em subpáginas como /games/123)
        const isActive = link.href === '/dashboard' ? pathname === link.href : pathname.startsWith(link.href);
        const isShop = link.label === 'Loja';

        return (
          <Link
            key={link.label}
            href={link.href}
            className={`flex items-center gap-4 px-4 py-3 rounded-xl transition-all group border ${
              isActive
                ? isShop 
                  ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-500' 
                  : 'bg-primary/15 border-primary/50 text-primary shadow-[0_0_15px_rgba(59,130,246,0.1)]'
                : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5 hover:border-border/50'
            }`}
          >
            {/* Ícone Padronizado (Largura fixa e centralizado) */}
            <span className={`flex items-center justify-center w-8 h-8 text-xl transition-transform ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
              {link.icon}
            </span>
            <span className={`font-bold text-sm ${isActive ? '' : isShop ? 'text-yellow-500/80 group-hover:text-yellow-400' : ''}`}>
              {link.label}
            </span>
          </Link>
        );
      })}
    </>
  );
}

export function MobileNavLinks({ links }: { links: NavLinkType[] }) {
  const pathname = usePathname();

  return (
    <>
      {links.filter(link => link.mobile).map((link) => {
        const isActive = link.href === '/dashboard' ? pathname === link.href : pathname.startsWith(link.href);
        const isShop = link.label === 'Loja';

        return (
          <Link
            key={link.label}
            href={link.href}
            className={`flex flex-col items-center justify-center w-16 h-full gap-1 transition-all ${
              isActive 
                ? isShop ? 'text-yellow-400 scale-110' : 'text-primary scale-110' 
                : 'text-gray-500 hover:text-gray-300 active:scale-95'
            }`}
          >
            {/* Ícone Mobile Padronizado */}
            <span className="flex items-center justify-center w-7 h-7 text-2xl">
              {link.icon}
            </span>
            <span className="text-[10px] font-bold tracking-wide">
              {link.label}
            </span>
          </Link>
        );
      })}
    </>
  );
}