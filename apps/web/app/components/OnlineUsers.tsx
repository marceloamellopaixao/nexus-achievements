'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import Image from 'next/image'
import Link from 'next/link'
import { RiArrowLeftSLine, RiArrowRightSLine } from 'react-icons/ri'

type OnlineUser = {
  user_id: string;
  username: string;
  avatar_url: string | null;
}

export default function OnlineUsers({ currentUser }: { currentUser: OnlineUser }) {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const [isOpen, setIsOpen] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!currentUser.user_id) return;

    const channel = supabase.channel('online-hunters', {
      config: { presence: { key: currentUser.user_id } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const users: OnlineUser[] = []
        for (const id in state) {
          const userPresence = state[id]?.[0] as unknown as OnlineUser
          if (userPresence) users.push(userPresence)
        }
        setOnlineUsers(users)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: currentUser.user_id,
            username: currentUser.username,
            avatar_url: currentUser.avatar_url,
          })
        }
      })

    return () => { supabase.removeChannel(channel) }
  }, [currentUser, supabase])

  const othersOnline = onlineUsers.filter(u => u.user_id !== currentUser.user_id)

  return (
    // NOVO: A tag <aside> agora faz parte do componente para podermos animar a largura
    <aside className={`${isOpen ? 'w-64' : 'w-20'} border-l border-border/50 bg-surface/30 backdrop-blur-xl hidden lg:flex flex-col z-40 shrink-0 transition-all duration-300 ease-in-out`}>
      
      {/* HEADER DO RADAR */}
      <div className={`flex items-center ${isOpen ? 'justify-between' : 'justify-center'} p-4 mt-2`}>
        {isOpen && (
          <h3 className="font-black text-gray-400 text-[11px] uppercase tracking-widest flex items-center gap-2 whitespace-nowrap">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
            </span>
            Radar Nexus
          </h3>
        )}
        
        {/* BOTÃO DE RECOLHER/EXPANDIR */}
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="text-gray-500 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors flex items-center justify-center shrink-0"
          title={isOpen ? "Ocultar Radar" : "Expandir Radar"}
        >
          {isOpen ? <RiArrowRightSLine className="w-6 h-6" /> : <RiArrowLeftSLine className="w-6 h-6" />}
        </button>
      </div>

      {/* CONTADOR (Visível apenas quando aberto) */}
      {isOpen && (
        <div className="px-4 mb-4">
          <span className="bg-green-500/10 text-green-400 text-[9px] uppercase font-black px-2 py-0.5 rounded-lg border border-green-500/20">
            {onlineUsers.length} Online
          </span>
        </div>
      )}

      {/* LISTA DE USUÁRIOS */}
      <div className="flex-1 space-y-2 overflow-y-auto custom-scrollbar px-3 pb-6">
        {othersOnline.length === 0 ? (
          <div className={`text-center ${isOpen ? 'py-10 mx-1' : 'py-6'} opacity-50 border border-dashed border-border rounded-2xl bg-background/30 transition-all`}>
            <span className={`${isOpen ? 'text-3xl' : 'text-xl'} grayscale mb-2 block`}>📡</span>
            {isOpen && <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Nenhum caçador ativo</p>}
          </div>
        ) : (
          othersOnline.map(u => (
            <Link 
              key={u.user_id} 
              href={`/profile/${u.username}`} 
              title={!isOpen ? u.username : undefined}
              className={`flex items-center p-2 rounded-2xl hover:bg-surface/80 border border-transparent hover:border-border/50 transition-all group active:scale-95 ${isOpen ? 'gap-3' : 'justify-center'}`}
            >
               <div className="relative shrink-0">
                 <div className="w-10 h-10 rounded-full overflow-hidden bg-background border border-border/50 shadow-sm group-hover:border-primary/50 transition-colors relative">
                    {u.avatar_url ? (
                      <Image src={u.avatar_url} fill className="object-cover group-hover:scale-110 transition-transform" alt="" unoptimized />
                    ) : (
                      <span className="flex items-center justify-center w-full h-full font-black text-primary bg-primary/5 text-xs">{u.username.charAt(0).toUpperCase()}</span>
                    )}
                 </div>
                 <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-background rounded-full shadow-sm"></div>
               </div>
               
               {isOpen && (
                 <div className="flex flex-col min-w-0">
                   <span className="font-bold text-gray-300 text-sm truncate group-hover:text-white transition-colors">{u.username}</span>
                   <span className="text-[9px] text-green-500 font-bold uppercase tracking-widest">Online</span>
                 </div>
               )}
            </Link>
          ))
        )}
      </div>
    </aside>
  )
}