'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import Image from 'next/image'
import Link from 'next/link'

type OnlineUser = {
  user_id: string;
  username: string;
  avatar_url: string | null;
}

export default function OnlineUsers({ currentUser }: { currentUser: OnlineUser }) {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])
  const supabase = createClient()

  useEffect(() => {
    if (!currentUser.user_id) return;

    // 1. Cria um canal global de presença
    const channel = supabase.channel('online-hunters', {
      config: {
        presence: {
          key: currentUser.user_id,
        },
      },
    })

    // 2. Escuta quem entra e quem sai
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const users: OnlineUser[] = []
        
        for (const id in state) {
          // CORREÇÃO DO TYPESCRIPT: Uso do Optional Chaining (?.) para garantir que o array existe
          const userPresence = state[id]?.[0] as unknown as OnlineUser
          if (userPresence) {
            users.push(userPresence)
          }
        }
        setOnlineUsers(users)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // 3. Transmite os dados ao entrar
          await channel.track({
            user_id: currentUser.user_id,
            username: currentUser.username,
            avatar_url: currentUser.avatar_url,
          })
        }
      })

    // 4. Desconecta ao sair
    return () => {
      supabase.removeChannel(channel)
    }
  }, [currentUser, supabase])

  const othersOnline = onlineUsers.filter(u => u.user_id !== currentUser.user_id)

  return (
    // ESTILO ATUALIZADO: Agora ocupa 100% da altura como uma sidebar natural
    <div className="flex flex-col h-full py-6 px-4">
      <div className="flex items-center justify-between mb-6 px-2">
        <h3 className="font-black text-gray-400 text-[11px] uppercase tracking-widest flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>
          </span>
          Radar Nexus
        </h3>
        <span className="bg-green-500/10 text-green-400 text-[9px] uppercase font-black px-2 py-0.5 rounded-lg border border-green-500/20">
          {onlineUsers.length} Online
        </span>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto custom-scrollbar pr-1">
        {othersOnline.length === 0 ? (
          <div className="text-center py-10 opacity-50 border border-dashed border-border rounded-2xl bg-background/30 mx-1">
            <span className="text-3xl grayscale mb-2 block">📡</span>
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Nenhum caçador ativo</p>
          </div>
        ) : (
          othersOnline.map(u => (
            <Link 
              key={u.user_id} 
              href={`/profile/${u.username}`} 
              className="flex items-center gap-3 p-2.5 rounded-2xl hover:bg-surface/80 border border-transparent hover:border-border/50 transition-all group active:scale-95"
            >
               <div className="relative shrink-0">
                 <div className="w-9 h-9 rounded-full overflow-hidden bg-background border border-border/50 shadow-sm group-hover:border-primary/50 transition-colors relative">
                    {u.avatar_url ? (
                      <Image src={u.avatar_url} fill className="object-cover group-hover:scale-110 transition-transform" alt="" unoptimized />
                    ) : (
                      <span className="flex items-center justify-center w-full h-full font-black text-primary bg-primary/5 text-xs">{u.username.charAt(0).toUpperCase()}</span>
                    )}
                 </div>
                 {/* BOLINHA VERMELHA (GREEN) DE STATUS */}
                 <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-background rounded-full shadow-sm"></div>
               </div>
               
               <div className="flex flex-col min-w-0">
                 <span className="font-bold text-gray-300 text-sm truncate group-hover:text-white transition-colors">{u.username}</span>
                 <span className="text-[9px] text-green-500 font-bold uppercase tracking-widest">Online</span>
               </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}