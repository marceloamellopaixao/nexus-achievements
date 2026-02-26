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
    <div className="space-y-0.5">
      {links.map((link) => {
        const isActive = link.href === '/social' ? pathname === link.href : pathname.startsWith(link.href);
        const isShop = link.href.includes('/shop');
        const isAdmin = link.href.includes('/admin');

        const match = link.label.match(/(.+?)\s*\((\d+)\)/);
        const displayName = match ? match[1] : link.label;
        const badgeCount = match ? match[2] : null;

        const activeBg = isShop ? 'bg-linear-to-r from-yellow-500/15 to-transparent' : isAdmin ? 'bg-linear-to-r from-red-500/15 to-transparent' : 'bg-linear-to-r from-primary/15 to-transparent';
        const activeText = isShop ? 'text-yellow-400' : isAdmin ? 'text-red-400' : 'text-primary';
        const activeBorder = isShop ? 'bg-yellow-500 shadow-[0_0_12px_rgba(234,179,8,0.6)]' : isAdmin ? 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.6)]' : 'bg-primary shadow-[0_0_12px_rgba(59,130,246,0.6)]';

        return (
          <Link
            key={link.href}
            href={link.href}
            title={link.label}
            className={`relative flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group overflow-hidden ${
              isActive 
                ? `${activeBg} ${activeText}` 
                : 'text-gray-400 hover:text-white hover:bg-surface/50'
            }`}
          >
            {/* Indicador Lateral Animado (Marcador de página ativa) */}
            <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1/2 rounded-r-full transition-all duration-300 ease-out ${
              isActive ? `${activeBorder} opacity-100 translate-x-0` : 'bg-transparent opacity-0 -translate-x-full'
            }`}></div>

            <div className={`relative flex items-center justify-center w-8 h-8 text-2xl shrink-0 transition-all duration-300 ${
              isActive ? 'scale-110 drop-shadow-md' : 'group-hover:scale-110'
            }`}>
              {link.icon}
              
              {/* Badge Dinâmico de Notificações */}
              {badgeCount && (
                <span className="absolute -top-1.5 -right-2 bg-red-500 text-white text-[9px] font-black px-1.5 min-w-4.5 h-4.5 flex items-center justify-center rounded-full shadow-[0_0_10px_rgba(239,68,68,0.8)] border-2 border-background animate-pulse">
                  {badgeCount}
                </span>
              )}
            </div>

            {/* truncate impede que o texto empurre a barra lateral em monitores menores */}
            <span className={`font-bold text-sm tracking-wide truncate transition-colors ${
              isActive ? '' : isShop ? 'group-hover:text-yellow-400' : isAdmin ? 'group-hover:text-red-400' : ''
            }`}>
              {displayName}
            </span>
          </Link>
        );
      })}
    </div>
  );
}

export function MobileNavLinks({ links }: { links: NavLinkType[] }) {
  const pathname = usePathname();

  return (
    <>
      {links.filter(link => link.mobile).map((link) => {
        const isActive = link.href === '/social' ? pathname === link.href : pathname.startsWith(link.href);
        const isShop = link.href.includes('/shop');
        const isAdmin = link.href.includes('/admin');

        const match = link.label.match(/(.+?)\s*\((\d+)\)/);
        const badgeCount = match ? match[2] : null;

        const activeColor = isShop ? 'text-yellow-400' : isAdmin ? 'text-red-400' : 'text-primary';
        const activeBg = isShop ? 'bg-yellow-500/20' : isAdmin ? 'bg-red-500/20' : 'bg-primary/20';

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`relative flex flex-col items-center justify-center w-16 h-full gap-1.5 transition-all duration-300 group ${
              isActive ? activeColor : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {/* Fundo de "Pílula" (Pill) quando ativo no Mobile */}
            <div className={`relative flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-300 ${
              isActive ? `${activeBg} scale-110 shadow-inner` : 'group-hover:bg-surface/60 group-hover:scale-110'
            }`}>
              <span className="text-[1.4rem] transition-transform duration-300 drop-shadow-md">
                {link.icon}
              </span>
              
              {/* Badge Mobile */}
              {badgeCount && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-black px-1.5 min-w-4 h-4 flex items-center justify-center rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)] border-2 border-background animate-pulse z-10">
                  {badgeCount}
                </span>
              )}
            </div>

            {/* Pontinho inferior da aba ativa (Substitui o texto no mobile) */}
            <div className={`absolute bottom-0.5 w-1.5 h-1.5 rounded-full transition-all duration-300 ${
              isActive ? 'bg-current opacity-100 scale-100' : 'opacity-0 scale-0'
            }`}></div>
          </Link>
        );
      })}
    </>
  );
}