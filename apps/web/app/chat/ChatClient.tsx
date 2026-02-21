'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { sendMessage } from './actions'
import Image from 'next/image'
import Link from 'next/link'

type ChatMessage = {
  id: string;
  content: string;
  created_at: string;
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
    // Escuta APENAS mensagens direcionadas a este canal específico
    const channel = supabase
      .channel(`chat_room_${channelId}`)
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'chat_messages',
        filter: `channel=eq.${channelId}` // O segredo da privacidade em tempo real
      }, async (payload) => {
        const { data: userData } = await supabase.from('users').select('username, avatar_url').eq('id', payload.new.user_id).single()
        
        const newMsg: ChatMessage = {
          id: payload.new.id,
          content: payload.new.content,
          created_at: payload.new.created_at,
          users: userData
        }

        setMessages(prev => {
          if (prev.find(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [supabase, channelId])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !currentUserId) return
    
    setLoading(true)
    const contentToSend = newMessage
    setNewMessage('') 
    
    await sendMessage(contentToSend, channelId) // Envia para o canal correto
    setLoading(false)
  }

  return (
    <div className="flex flex-col h-full bg-surface/50 border border-border rounded-3xl overflow-hidden shadow-2xl">
      <div className="bg-background/80 backdrop-blur-md border-b border-border p-4 flex items-center gap-3 z-10">
        <span className="text-2xl">{icon}</span>
        <div>
          <h2 className="font-black text-white text-lg">{chatTitle}</h2>
          <p className="text-xs text-primary font-bold uppercase tracking-wider">{chatSubtitle}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 custom-scrollbar">
        {messages.map((msg) => {
          const isMe = currentUserId === (msg as any).user_id; // Identifica se fui eu que enviei
          return (
            <div key={msg.id} className="flex gap-3 animate-in fade-in slide-in-from-bottom-2">
              <Link href={`/profile/${msg.users?.username}`} className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-border bg-background relative hover:border-primary transition-colors">
                {msg.users?.avatar_url ? <Image src={msg.users.avatar_url} alt="Avatar" fill className="object-cover" /> : <span className="flex items-center justify-center w-full h-full font-bold text-white text-sm">{msg.users?.username?.charAt(0)}</span>}
              </Link>
              <div className="flex flex-col w-full max-w-[85%]">
                <div className="flex items-baseline gap-2 mb-1">
                  <Link href={`/profile/${msg.users?.username}`} className="font-bold text-white text-sm hover:text-primary transition-colors">{msg.users?.username}</Link>
                  <span className="text-[10px] text-gray-500">{new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className={`border px-4 py-2.5 rounded-2xl text-sm shadow-sm inline-block w-fit break-words ${isMe ? 'bg-primary/10 border-primary text-white rounded-tl-none' : 'bg-surface border-border text-gray-200 rounded-tr-none'}`}>
                  {msg.content}
                </div>
              </div>
            </div>
          )
        })}
        {messages.length === 0 && <div className="text-center pt-20 text-gray-500 text-sm font-medium">Nenhuma mensagem neste chat. Diga olá! 👋</div>}
        <div ref={messagesEndRef} />
      </div>

      {currentUserId ? (
        <form onSubmit={handleSend} className="bg-background/80 backdrop-blur-md border-t border-border p-4 flex gap-3">
          <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Envie uma mensagem..." className="flex-1 bg-surface border border-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors" maxLength={500} />
          <button type="submit" disabled={loading || !newMessage.trim()} className="px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary/80 transition-all disabled:opacity-50 shrink-0">Enviar</button>
        </form>
      ) : (
        <div className="bg-background/80 border-t border-border p-6 text-center"><p className="text-gray-400 font-bold">Faça login para participar.</p></div>
      )}
    </div>
  )
}