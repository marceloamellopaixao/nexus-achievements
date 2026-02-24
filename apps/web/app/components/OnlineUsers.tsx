'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/utils/supabase/client'
import Image from 'next/image'
import Link from 'next/link'
import { RiArrowLeftSLine, RiArrowRightSLine, RiSearchLine } from 'react-icons/ri'
import { FaUserCircle } from 'react-icons/fa'

type BaseUser = {
  user_id: string;
  username: string;
  avatar_url: string | null;
}

type DisplayUser = BaseUser & {
  isOnline: boolean;
}

export default function OnlineUsers({ currentUser }: { currentUser: BaseUser }) {
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set())
  const [allUsers, setAllUsers] = useState<BaseUser[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [isOpen, setIsOpen] = useState(true)
  const supabase = createClient()

  // 1. Busca todos os utilizadores da plataforma na montagem do componente
  useEffect(() => {
    const fetchAllUsers = async () => {
      const { data } = await supabase
        .from('users')
        .select('id, username, avatar_url')
        .neq('id', currentUser.user_id) // Exclui o próprio utilizador logado
        .limit(100); // Limite de segurança para não pesar a memória
      
      if (data) {
        const formattedUsers: BaseUser[] = data.map(u => ({
          user_id: u.id,
          username: u.username,
          avatar_url: u.avatar_url
        }));
        setAllUsers(formattedUsers);
      }
    };
    
    fetchAllUsers();
  }, [currentUser.user_id, supabase]);

  // 2. Conecta ao canal do Supabase para escutar quem está Online em tempo real
  useEffect(() => {
    if (!currentUser.user_id) return;

    const channel = supabase.channel('online-hunters', {
      config: { presence: { key: currentUser.user_id } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const activeIds = new Set<string>()
        
        for (const id in state) {
          const userPresence = state[id]?.[0] as unknown as BaseUser
          if (userPresence && userPresence.user_id !== currentUser.user_id) {
            activeIds.add(userPresence.user_id)
            
            // Se alguém entrou online mas não estava na lista inicial de 'allUsers', adicionamos dinamicamente
            setAllUsers(prev => {
              if (!prev.find(u => u.user_id === userPresence.user_id)) {
                return [...prev, userPresence];
              }
              return prev;
            });
          }
        }
        setOnlineIds(activeIds)
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

  // 3. Filtra e Ordena a lista combinada (Pesquisa + Online no Topo)
  const displayList = useMemo(() => {
    let list: DisplayUser[] = allUsers.map(u => ({
      ...u,
      isOnline: onlineIds.has(u.user_id)
    }));

    // Aplica a pesquisa
    if (searchQuery.trim()) {
      list = list.filter(u => u.username.toLowerCase().includes(searchQuery.toLowerCase()));
    }

    // Ordena: Online primeiro, depois alfabeticamente
    return list.sort((a, b) => {
      if (a.isOnline === b.isOnline) {
        return a.username.localeCompare(b.username);
      }
      return a.isOnline ? -1 : 1;
    });
  }, [allUsers, onlineIds, searchQuery]);

  return (
    <aside className={`${isOpen ? 'w-64 md:w-72' : 'w-20'} border-l border-white/5 bg-surface/30 backdrop-blur-xl hidden lg:flex flex-col z-40 shrink-0 transition-all duration-300 ease-in-out`}>
      
      {/* HEADER DO RADAR */}
      <div className={`flex items-center ${isOpen ? 'justify-between' : 'justify-center'} p-4 mt-2 shrink-0`}>
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
          onClick={() => {
            setIsOpen(!isOpen);
            if (isOpen) setSearchQuery(''); // Limpa a pesquisa ao fechar
          }}
          className="text-gray-500 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors flex items-center justify-center shrink-0"
          title={isOpen ? "Ocultar Radar" : "Expandir Radar"}
        >
          {isOpen ? <RiArrowRightSLine className="w-6 h-6" /> : <RiArrowLeftSLine className="w-6 h-6" />}
        </button>
      </div>

      {/* CONTADOR E PESQUISA (Visíveis apenas quando aberto) */}
      {isOpen && (
        <div className="px-4 mb-4 space-y-4 shrink-0">
          <div className="flex items-center justify-between">
            <span className="bg-green-500/10 text-green-400 text-[9px] uppercase font-black px-2.5 py-1 rounded-lg border border-green-500/20">
              {onlineIds.size} Online
            </span>
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              {allUsers.length} Membros
            </span>
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <RiSearchLine className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Buscar caçador..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-background/50 border border-white/5 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-primary/50 focus:bg-background transition-all placeholder:text-gray-600 font-medium"
            />
          </div>
        </div>
      )}

      {/* DIVISÓRIA SUTIL */}
      {isOpen && <div className="h-px bg-linear-to-r from-transparent via-white/5 to-transparent mb-2 shrink-0"></div>}

      {/* LISTA DE USUÁRIOS (ONLINE + OFFLINE) */}
      <div className="flex-1 space-y-1.5 overflow-y-auto custom-scrollbar px-3 pb-6 min-h-0">
        {displayList.length === 0 ? (
          <div className={`text-center ${isOpen ? 'py-10 mx-1' : 'py-6'} opacity-50 border border-dashed border-white/10 rounded-2xl bg-background/30 transition-all`}>
            <FaUserCircle className={`mx-auto ${isOpen ? 'text-3xl' : 'text-xl'} mb-2 text-gray-500`} />
            {isOpen && <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest px-2">Nenhum resultado</p>}
          </div>
        ) : (
          displayList.map(u => (
            <Link 
              key={u.user_id} 
              href={`/profile/${u.username}`} 
              title={!isOpen ? `${u.username} (${u.isOnline ? 'Online' : 'Offline'})` : undefined}
              className={`flex items-center p-2 rounded-2xl hover:bg-surface/80 border border-transparent hover:border-white/5 transition-all group active:scale-95 ${isOpen ? 'gap-3' : 'justify-center'}`}
            >
               <div className="relative shrink-0">
                 <div className={`w-10 h-10 rounded-full overflow-hidden bg-background border shadow-sm transition-colors relative ${u.isOnline ? 'border-primary/30 group-hover:border-primary' : 'border-white/5 group-hover:border-white/20 grayscale opacity-80 group-hover:grayscale-0 group-hover:opacity-100'}`}>
                    {u.avatar_url ? (
                      <Image src={u.avatar_url} fill className="object-cover group-hover:scale-110 transition-transform" alt="" unoptimized />
                    ) : (
                      <span className={`flex items-center justify-center w-full h-full font-black text-xs ${u.isOnline ? 'text-primary bg-primary/10' : 'text-gray-400 bg-white/5'}`}>{u.username.charAt(0).toUpperCase()}</span>
                    )}
                 </div>
                 {/* Indicador de Status (Verde para Online, Cinza para Offline) */}
                 {u.isOnline ? (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-surface rounded-full shadow-sm"></div>
                 ) : (
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-gray-500 border-2 border-surface rounded-full shadow-sm"></div>
                 )}
               </div>
               
               {isOpen && (
                 <div className="flex flex-col min-w-0 flex-1">
                   <span className={`font-bold text-sm truncate transition-colors ${u.isOnline ? 'text-gray-200 group-hover:text-white' : 'text-gray-500 group-hover:text-gray-300'}`}>
                     {u.username}
                   </span>
                   <span className={`text-[9px] font-bold uppercase tracking-widest ${u.isOnline ? 'text-green-500' : 'text-gray-600'}`}>
                     {u.isOnline ? 'Online' : 'Offline'}
                   </span>
                 </div>
               )}
            </Link>
          ))
        )}
      </div>
    </aside>
  )
}