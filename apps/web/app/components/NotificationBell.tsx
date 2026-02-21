'use client'

import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { FaBell } from 'react-icons/fa';
import Link from 'next/link';
import Image from 'next/image';

// 1. DEFINIÇÃO DE INTERFACES PARA ELIMINAR O 'ANY'
interface Actor {
  username: string;
  avatar_url: string | null;
}

interface Notification {
  id: string;
  user_id: string;
  actor_id: string;
  type: string;
  content: string;
  target_link: string | null;
  read: boolean;
  created_at: string;
  actor: Actor | null;
}

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]); // Tipagem aplicada aqui
  const supabase = createClient();

  useEffect(() => {
    async function loadNotifications() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('notifications')
        .select('*, actor:users!actor_id(username, avatar_url)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      // Tratamento para garantir que o actor venha como objeto único
      const formatted = (data as unknown as Notification[])?.map(n => ({
        ...n,
        actor: Array.isArray(n.actor) ? n.actor[0] : n.actor
      })) || [];

      setNotifications(formatted);
      setUnreadCount(formatted.filter(n => !n.read).length);
    }

    loadNotifications();

    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        async (payload) => {
          // Busca os dados do actor para a nova notificação em tempo real
          const { data: actorData } = await supabase
            .from('users')
            .select('username, avatar_url')
            .eq('id', payload.new.actor_id)
            .single();

          const newNotif: Notification = {
            ...(payload.new as Notification),
            actor: actorData
          };

          setUnreadCount(prev => prev + 1);
          setNotifications(prev => [newNotif, ...prev].slice(0, 5));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase]);

  const markAllRead = async () => {
    setUnreadCount(0);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('notifications').update({ read: true }).eq('user_id', user.id);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => { setIsOpen(!isOpen); if (!isOpen) markAllRead(); }}
        className="p-2.5 rounded-xl bg-surface hover:bg-white/10 transition-all border border-border relative group"
      >
        <FaBell className={`text-lg ${unreadCount > 0 ? 'text-primary' : 'text-gray-400'}`} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-background animate-bounce">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 bg-surface/90 backdrop-blur-xl border border-border rounded-3xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
          <div className="p-4 border-b border-border bg-background/40">
            <h3 className="font-black text-white text-xs uppercase tracking-widest">Atividade Recente</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm font-bold">Nenhuma novidade por aqui.</div>
            ) : (
              notifications.map(n => (
                <Link
                  key={n.id}
                  href={n.target_link || '#'}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-3 p-4 hover:bg-white/5 border-b border-white/5 transition-colors group"
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden border border-border shrink-0 relative bg-background">
                    {n.actor?.avatar_url ? (
                      <Image src={n.actor.avatar_url} alt="" fill className="object-cover" unoptimized />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-primary italic">N</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-300 leading-snug">
                      <span className="font-black text-white">{n.actor?.username}</span> {n.content}
                    </p>
                    <span className="text-[10px] text-gray-500 font-bold uppercase mt-1 block">Agora mesmo</span>
                  </div>
                  {!n.read && <div className="w-2 h-2 bg-primary rounded-full shrink-0" />}
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}