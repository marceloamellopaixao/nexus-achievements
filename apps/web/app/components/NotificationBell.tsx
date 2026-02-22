'use client'

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { FaBell } from 'react-icons/fa';
import Link from 'next/link';
import Image from 'next/image';

interface Actor { username: string; avatar_url: string | null; }
interface Notification {
  id: string; user_id: string; actor_id: string; type: string;
  content: string; target_link: string | null; read: boolean;
  created_at: string; actor: Actor | null;
}

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const supabase = createClient();

  useEffect(() => {
    let user_id: string;

    async function initNotifications() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      user_id = user.id;

      // 1. Carregar notificações iniciais
      const { data } = await supabase
        .from('notifications')
        .select('*, actor:users!actor_id(username, avatar_url)')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false })
        .limit(10);

      const formatted = (data as unknown as Notification[])?.map(n => ({
        ...n,
        actor: Array.isArray(n.actor) ? n.actor[0] : n.actor
      })) || [];

      setNotifications(formatted);
      setUnreadCount(formatted.filter(n => !n.read).length);

      // 2. ESCUTA EM TEMPO REAL COM FILTRO
      // O filtro garante que você só ouça as notificações destinadas a você
      const channel = supabase
        .channel(`realtime-notifications-${user_id}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${user_id}` // FILTRO CRÍTICO
        }, async (payload) => {
          // Busca dados do ator para a nova notificação
          const { data: actorData } = await supabase
            .from('users')
            .select('username, avatar_url')
            .eq('id', payload.new.actor_id)
            .single();

          const newNotif: Notification = {
            ...(payload.new as Notification),
            actor: actorData
          };

          setNotifications(prev => [newNotif, ...prev].slice(0, 10));
          setUnreadCount(prev => prev + 1);
          
          // Opcional: Tocar um som ou mostrar um toast aqui
        })
        .subscribe();

      return channel;
    }

    const channelPromise = initNotifications();

    return () => {
      channelPromise.then(channel => {
        if (channel) supabase.removeChannel(channel);
      });
    };
  }, [supabase]);

  const markAllRead = async () => {
    if (unreadCount === 0) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUnreadCount(0);
      await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => { setIsOpen(!isOpen); if (!isOpen) markAllRead(); }}
        className="p-2.5 rounded-xl bg-surface hover:bg-white/10 transition-all border border-border relative group"
      >
        <FaBell className={`text-lg transition-colors ${unreadCount > 0 ? 'text-primary' : 'text-gray-400'}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-background animate-bounce shadow-lg">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-85 bg-surface/95 backdrop-blur-xl border border-border rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
          <div className="p-4 border-b border-border bg-background/40 flex justify-between items-center">
            <h3 className="font-black text-white text-xs uppercase tracking-widest">Notificações</h3>
            {unreadCount > 0 && <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold">Novas</span>}
          </div>
          <div className="max-h-100 overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="p-10 text-center flex flex-col items-center opacity-40">
                <span className="text-3xl mb-2">📭</span>
                <p className="text-xs font-bold uppercase tracking-tighter">Tudo limpo por aqui</p>
              </div>
            ) : (
              notifications.map(n => (
                <Link
                  key={n.id}
                  href={n.target_link || '#'}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-3 p-4 border-b border-white/5 transition-colors group ${!n.read ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-white/5'}`}
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-border shrink-0 relative bg-background">
                    {n.actor?.avatar_url ? (
                      <Image src={n.actor.avatar_url} alt="" fill className="object-cover" unoptimized />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-primary italic bg-primary/10 text-xs">N</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-gray-300 leading-snug">
                      <span className="font-black text-white">{n.actor?.username || 'Alguém'}</span> {n.content}
                    </p>
                    <p className="text-[10px] text-gray-500 font-bold uppercase mt-1">
                      {new Date(n.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  {!n.read && <div className="w-2 h-2 bg-primary rounded-full shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />}
                </Link>
              ))
            )}
          </div>
          <Link href="/notifications" className="p-3 text-center block text-[10px] font-black text-gray-500 uppercase hover:text-white transition-colors bg-background/20">
             Ver Histórico Completo
          </Link>
        </div>
      )}
    </div>
  );
}