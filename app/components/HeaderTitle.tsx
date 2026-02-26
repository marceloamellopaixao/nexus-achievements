'use client'

import { usePathname } from 'next/navigation';
import QuestsModal from './QuestsModal';

interface NavLink {
  href: string;
  label: string;
}

export default function HeaderTitle({ links }: { links: NavLink[] }) {
  const pathname = usePathname();

  const currentPath = links.find(link => 
    pathname === link.href || (link.href !== '/social' && pathname.startsWith(link.href))
  );

  return (
    <div className="flex items-center gap-4">
      <h1 className="text-xl md:text-2xl font-black text-transparent bg-clip-text bg-linear-to-r from-primary to-purple-500 tracking-tighter uppercase">
        {currentPath?.label || 'NEXUS'}
      </h1>
      <QuestsModal />
    </div>
  );
}