'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/utils/supabase/client'
import { FaGlobeAmericas, FaSearch, FaPlus, FaTimes, FaRegCommentDots, FaArchive, FaSteam, FaGamepad } from 'react-icons/fa'

interface ChatUser { id: string; username: string; avatar_url: string | null; }

interface PlayingState {
  title: string;
  appId: string | number;
  platform: string;
  image_url: string | null;
}

interface PresencePayload {
  user_id: string;
  playing?: PlayingState | null;
}

interface ChatSidebarProps {
  activeUsers: ChatUser[];
  archivedUsers: ChatUser[];
  followingUsers: ChatUser[];
  unreadCounts: Record<string, number>;
  unreadGlobalCount: number;
}

export default function ChatSidebar({ activeUsers, archivedUsers, followingUsers, unreadCounts, unreadGlobalCount }: ChatSidebarProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'active' | 'archived'>('active');
  
  // 🔥 NOVIDADE: Estado Global de Presença e Rich Presence
  const [onlinePresence, setOnlinePresence] = useState<Record<string, { online: boolean, playing: PlayingState | null }>>({});
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase.channel('online-hunters').on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      
      // Tipagem forte na variável provisória
      const newPresence: Record<string, { online: boolean, playing: PlayingState | null }> = {};
      
      for (const id in state) {
        (state[id] as unknown as PresencePayload[]).forEach(u => {
          newPresence[u.user_id] = { online: true, playing: u.playing || null };
        });
      }
      setOnlinePresence(newPresence);
    }).subscribe();
    
    return () => { supabase.removeChannel(channel); }
  }, [supabase]);

  const filteredFollowing = useMemo(() => {
    return followingUsers.filter(u => u.username.toLowerCase().includes(search.toLowerCase()));
  }, [followingUsers, search]);

  const displayUsers = tab === 'active' ? activeUsers : archivedUsers;

  return (
    <>
      <input type="checkbox" id="mobile-sidebar" className="peer hidden" />
      <label htmlFor="mobile-sidebar" className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 opacity-0 pointer-events-none peer-checked:opacity-100 peer-checked:pointer-events-auto md:hidden transition-opacity duration-300"></label>

      <div className="fixed md:relative z-50 inset-y-0 left-0 w-72 md:w-80 transform -translate-x-full peer-checked:translate-x-0 md:translate-x-0 transition-transform duration-300 ease-out bg-surface/95 md:bg-surface/40 backdrop-blur-3xl border-r md:border border-white/10 md:rounded-4xl p-5 flex flex-col shadow-2xl h-full shrink-0">
        
        <div className="flex items-center justify-between mb-6 px-1 shrink-0">
          <h2 className="font-black text-white text-xl tracking-tight">Mensagens</h2>
          <button onClick={() => setIsModalOpen(true)} className="bg-primary/20 text-primary p-2 rounded-xl hover:bg-primary hover:text-white transition-colors" title="Nova Mensagem">
            <FaPlus />
          </button>
        </div>

        <Link href="/chat" className="flex items-center gap-3 p-3 rounded-2xl hover:bg-primary/10 transition-all mb-4 border border-white/5 bg-background/50 group active:scale-95 shrink-0">
          <div className="relative shrink-0">
            <div className="w-11 h-11 bg-primary/20 rounded-xl flex items-center justify-center text-xl shadow-inner border border-primary/20 group-hover:scale-105 transition-transform text-primary"><FaGlobeAmericas /></div>
            {unreadGlobalCount > 0 && <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 border-2 border-surface rounded-full animate-pulse z-10 shadow-sm"></div>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-black text-white text-sm">Chat Global</div>
            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter flex items-center gap-1"><span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse inline-block"></span> Sala da Comunidade</div>
          </div>
          {unreadGlobalCount > 0 && <div className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 shadow-[0_0_10px_rgba(239,68,68,0.5)]">{unreadGlobalCount > 99 ? '99+' : unreadGlobalCount}</div>}
        </Link>

        <div className="flex items-center gap-2 mb-4 bg-background/50 p-1 rounded-xl shrink-0">
          <button 
            onClick={() => setTab('active')} 
            className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-1.5 ${tab === 'active' ? 'bg-primary text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <FaRegCommentDots className="text-sm" /> Ativos
          </button>
          <button 
            onClick={() => setTab('archived')} 
            className={`flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-1.5 ${tab === 'archived' ? 'bg-gray-700 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
          >
            <FaArchive className="text-sm" /> Arquivados {archivedUsers.length > 0 && `(${archivedUsers.length})`}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2 min-h-0">
          {displayUsers.length === 0 ? (
            <div className="bg-background/30 border border-dashed border-white/10 rounded-2xl p-6 text-center">
              <p className="text-xs text-gray-500 font-medium leading-relaxed">
                {tab === 'active' 
                  ? <>Nenhum chat recente. Clique no <strong className="text-primary">+</strong> para iniciar uma conversa.</>
                  : 'Sua gaveta de arquivos está vazia.'}
              </p>
            </div>
          ) : (
            displayUsers.map(u => {
              const unread = unreadCounts[u.id] || 0;
              const presence = onlinePresence[u.id]; // Pega o status do usuário

              return (
                <Link key={u.id} href={`/chat/${u.username}`} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-surface/80 hover:border-primary/30 transition-all border border-transparent group active:scale-95">
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 rounded-full overflow-hidden bg-background border border-white/10 relative shadow-md group-hover:border-primary/50 transition-colors">
                      {u.avatar_url ? <Image src={u.avatar_url} fill className="object-cover group-hover:scale-110 transition-transform" alt="" unoptimized /> : <span className="flex items-center justify-center w-full h-full font-black text-primary bg-primary/5 text-xs">{u.username.charAt(0).toUpperCase()}</span>}
                    </div>
                    {/* Bolinha Verde de Online */}
                    {presence?.online && <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-surface rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]"></span>}
                    {unread > 0 && <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 border-2 border-surface rounded-full animate-pulse z-10 shadow-sm"></div>}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-bold text-gray-300 text-sm truncate group-hover:text-white transition-colors">{u.username}</span>
                    
                    {/* Renderiza o que ele está jogando ou apenas 'Mensagem Direta' */}
                    {presence?.playing ? (
                      <span className="text-[9px] text-green-400 font-black truncate flex items-center gap-1.5 uppercase tracking-widest mt-0.5">
                        {presence.playing.platform === 'Steam' ? <FaSteam className="text-xs shrink-0" /> : <FaGamepad className="text-xs shrink-0" />} 
                        <span className="truncate">Jogando: {presence.playing.title}</span>
                      </span>
                    ) : (
                      <span className="text-[9px] text-primary font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity translate-y-1 group-hover:translate-y-0 absolute mt-5">Mensagem Direta</span>
                    )}
                  </div>
                  {unread > 0 && <div className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 shadow-[0_0_10px_rgba(239,68,68,0.5)]">{unread}</div>}
                </Link>
              )
            })
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="bg-surface border border-white/10 p-6 rounded-4xl w-full max-w-md relative z-10 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-black text-white">Nova Mensagem</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-white p-2 bg-background rounded-xl transition-colors"><FaTimes /></button>
            </div>
            
            <div className="relative mb-4">
              <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
              <input 
                type="text" placeholder="Buscar amigos..." 
                className="w-full bg-background border border-white/5 rounded-xl pl-11 pr-4 py-3 text-sm text-white focus:outline-none focus:border-primary transition-all"
                value={search} onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-2 pr-2">
              {filteredFollowing.length === 0 ? (
                <p className="text-center text-sm text-gray-500 py-6">Nenhum caçador encontrado na sua lista.</p>
              ) : (
                filteredFollowing.map(u => (
                  <Link key={u.id} href={`/chat/${u.username}`} onClick={() => setIsModalOpen(false)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-all">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-background relative shrink-0 border border-white/10">
                      {u.avatar_url ? <Image src={u.avatar_url} fill className="object-cover" alt="" unoptimized /> : <span className="flex items-center justify-center w-full h-full font-black text-primary text-xs">{u.username.charAt(0)}</span>}
                    </div>
                    <span className="font-bold text-gray-200 text-sm truncate">{u.username}</span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}