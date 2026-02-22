'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { sendMessage } from './actions'
import Image from 'next/image'
import Link from 'next/link'

// Tipagem atualizada para incluir o user_id vindo do banco
type ChatMessage = {
  id: string;
  content: string;
  created_at: string;
  user_id: string; // Adicionado para identificar o autor sem usar 'any'
  users: { username: string; avatar_url: string | null } | null;
}

interface ChatProps {
  initialMessages: ChatMessage[];
  currentUserId?: string;
  channelId?: string;
  chatTitle?: string;
  chatSubtitle?: string;
  icon?: string | React.ReactNode;
}

export default function ChatClient({
  initialMessages,
  currentUserId,
  channelId = 'global',
  chatTitle = 'Taverna do Nexus',
  chatSubtitle = 'Chat Global ao Vivo',
  icon = '🍻'
}: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const channel = supabase
      .channel(`chat_room_${channelId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `channel=eq.${channelId}`
      }, async (payload) => {
        const payloadNew = payload.new as { id: string, content: string, created_at: string, user_id: string };

        const { data: userData } = await supabase
          .from('users')
          .select('username, avatar_url')
          .eq('id', payloadNew.user_id)
          .single();

        const newMsg: ChatMessage = {
          id: payload.new.id,
          content: payload.new.content,
          created_at: payload.new.created_at,
          user_id: payload.new.user_id,
          users: userData
        };

        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel) }
  }, [supabase, channelId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !currentUserId) return

    setLoading(true)
    const contentToSend = newMessage
    setNewMessage('')

    await sendMessage(contentToSend, channelId)
    setLoading(false)
  }


  return (
    <div className="flex flex-col h-full bg-surface/40 backdrop-blur-xl border border-border rounded-3xl overflow-hidden shadow-2xl animate-in fade-in duration-500">

      {/* Header do Chat */}
      <div className="bg-background/60 backdrop-blur-md border-b border-border p-4 flex items-center gap-4 z-10 shadow-sm">
        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-2xl border border-primary/20 shadow-inner">
          {icon}
        </div>
        <div>
          <h2 className="font-black text-white text-lg tracking-tight">{chatTitle}</h2>
          <p className="text-[10px] text-primary font-black uppercase tracking-[0.2em]">{chatSubtitle}</p>
        </div>
      </div>

      {/* Área das Mensagens */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar bg-background/20">
        {messages.map((msg) => {
          const isMe = currentUserId === msg.user_id; // Verificação tipada sem erro

          return (
            <div key={msg.id} className={`flex gap-3 animate-in fade-in slide-in-from-bottom-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>

              <Link href={`/profile/${msg.users?.username}`} className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-border/50 bg-surface relative hover:border-primary transition-all group shadow-md">
                {msg.users?.avatar_url ? (
                  <Image src={msg.users.avatar_url} alt="Avatar" fill className="object-cover group-hover:scale-110 transition-transform" unoptimized />
                ) : (
                  <span className="flex items-center justify-center w-full h-full font-black text-primary text-xs bg-primary/5">{msg.users?.username?.charAt(0).toUpperCase()}</span>
                )}
              </Link>

              <div className={`flex flex-col w-full max-w-[80%] ${isMe ? 'items-end' : 'items-start'}`}>
                <div className={`flex items-baseline gap-2 mb-1.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                  <Link href={`/profile/${msg.users?.username}`} className="font-black text-white text-xs hover:text-primary transition-colors">{msg.users?.username}</Link>
                  <span className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter">
                    {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div className={`border px-4 py-3 rounded-2xl text-sm shadow-sm leading-relaxed wrap-break-word transition-all ${isMe
                  ? 'bg-primary border-primary/30 text-white rounded-tr-none shadow-primary/10'
                  : 'bg-surface/80 border-border/50 text-gray-200 rounded-tl-none'
                  }`}>
                  {msg.content}
                </div>
              </div>
            </div>
          )
        })}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full opacity-40 grayscale pt-20">
            <span className="text-5xl mb-4">💬</span>
            <p className="text-sm font-black uppercase tracking-widest text-gray-400">O silêncio reina na Taverna...</p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input de Mensagem */}
      {currentUserId ? (
        <form onSubmit={handleSend} className="bg-background/80 backdrop-blur-xl border-t border-border/50 p-4 md:p-6 flex gap-3 z-20">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Digite sua mensagem para a guilda..."
            className="flex-1 bg-surface border border-border/50 rounded-xl px-5 py-3.5 text-sm text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-inner placeholder:text-gray-600"
            maxLength={500}
          />
          <button
            type="submit"
            disabled={loading || !newMessage.trim()}
            className="px-8 py-3.5 bg-primary text-white font-black text-sm rounded-xl hover:bg-primary/80 hover:shadow-[0_0_20px_rgba(59,130,246,0.4)] transition-all active:scale-95 disabled:opacity-50 disabled:grayscale shrink-0 flex items-center justify-center gap-2"
          >
            {loading ? <span className="animate-spin text-lg">🔄</span> : <span>Enviar</span>}
          </button>
        </form>
      ) : (
        <div className="bg-background/60 backdrop-blur-md border-t border-border/50 p-8 text-center animate-pulse">
          <p className="text-gray-400 font-black text-xs uppercase tracking-[0.2em]">Entre no Nexus para enviar mensagens.</p>
        </div>
      )}
    </div>
  )
}