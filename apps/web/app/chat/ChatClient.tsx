'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { sendMessage, markChannelAsRead, toggleChatFollow, clearChatMessages, deleteSingleMessage, getChatPreferences, toggleChatPreference, submitUserReport } from './actions'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  FaPaperPlane, FaBars, FaSpinner, FaRegComments, FaShieldAlt,
  FaEllipsisV, FaTrash, FaUserShield, FaVolumeMute, FaVolumeUp, FaArchive, FaBoxOpen, FaUserCircle, FaTimes, FaVideoSlash
} from 'react-icons/fa'
import { toast } from 'react-toastify'
import { useFocusMode } from '@/app/contexts/FocusModeContext' // 🔥 Cérebro Importado

type ChatMessage = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  users: { username: string; avatar_url: string | null } | null;
}

interface ChatProps {
  initialMessages: ChatMessage[];
  currentUserId?: string;
  channelId?: string;
  chatTitle?: string;
  chatSubtitle?: string;
  icon?: string | React.ReactNode;
  isPrivate?: boolean;
  isFollowingTarget?: boolean;
  targetUserId?: string;
  isAdmin?: boolean;
}

export default function ChatClient({
  initialMessages,
  currentUserId,
  channelId = 'global',
  chatTitle = 'Nexus Chat',
  chatSubtitle = 'Chat Global ao Vivo',
  icon,
  isPrivate = false,
  isFollowingTarget = true,
  targetUserId,
  isAdmin = false
}: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [followingState, setFollowingState] = useState(isFollowingTarget)
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const [isMuted, setIsMuted] = useState(false)
  const [isArchived, setIsArchived] = useState(false)

  // Modais
  const [modalState, setModalState] = useState<'none' | 'delete' | 'report'>('none')
  const [reportReason, setReportReason] = useState('')
  const [isSubmittingModal, setIsSubmittingModal] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const router = useRouter()

  // 🔥 Busca o estado do Modo Streamer
  const { isFocusMode } = useFocusMode()

  useEffect(() => {
    async function loadPreferences() {
      if (channelId !== 'global') {
        const prefs = await getChatPreferences(channelId);
        setIsMuted(prefs.is_muted);
        setIsArchived(prefs.is_archived);
      }
    }
    loadPreferences();
  }, [channelId]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  useEffect(() => {
    const sidebarToggle = document.getElementById('mobile-sidebar') as HTMLInputElement;
    if (sidebarToggle) sidebarToggle.checked = false;
  }, [channelId])

  useEffect(() => {
    if (currentUserId && !isFocusMode) {
      const timer = setTimeout(() => { markChannelAsRead(channelId); }, 500);
      return () => clearTimeout(timer);
    }
  }, [channelId, currentUserId, messages.length, isFocusMode]);

  useEffect(() => {
    const channel = supabase
      .channel(`chat_room_${channelId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `channel=eq.${channelId}`
      }, async (payload) => {
        const payloadNew = payload.new as { id: string, content: string, created_at: string, user_id: string };
        const { data: userData } = await supabase.from('users').select('username, avatar_url').eq('id', payloadNew.user_id).single();

        const newMsg: ChatMessage = {
          id: payload.new.id, content: payload.new.content, created_at: payload.new.created_at, user_id: payload.new.user_id, users: userData
        };

        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });

        // 🔥 O SOM ESTÁ AGORA BLINDADO CONTRA O MODO FOCUS
        if (payloadNew.user_id !== currentUserId && !isMuted && !isFocusMode) {
          const audio = new Audio('/sounds/receive.mp3');
          audio.volume = 0.5;
          audio.play().catch(() => { });
        }

      })
      .on('postgres_changes', {
        event: 'DELETE', schema: 'public', table: 'chat_messages', filter: `channel=eq.${channelId}`
      }, (payload) => {
        setMessages(prev => prev.filter(m => m.id !== payload.old.id));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel) }
  }, [supabase, channelId, currentUserId, isMuted, isFocusMode]); // isFocusMode adicionado as dependências!

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !currentUserId) return

    setLoading(true)
    const contentToSend = newMessage
    setNewMessage('')

    const audio = new Audio('/sounds/send.mp3');
    audio.volume = 0.3;
    audio.play().catch(() => { });

    await sendMessage(contentToSend, channelId)
    setLoading(false)
  }

  const handleToggleMute = async () => {
    setIsMenuOpen(false);
    const res = await toggleChatPreference(channelId, 'mute', isMuted);
    if (res.success) {
      setIsMuted(res.newValue as boolean);
      toast.info(res.newValue ? 'Chat silenciado.' : 'Notificações ativadas para este chat.', { theme: 'dark' });
    }
  }

  const handleToggleArchive = async () => {
    setIsMenuOpen(false);
    const res = await toggleChatPreference(channelId, 'archive', isArchived);
    if (res.success) {
      setIsArchived(res.newValue as boolean);
      toast.success(res.newValue ? 'Conversa movida para os Arquivados.' : 'Conversa restaurada dos Arquivados.', { theme: 'dark' });
    }
  }

  const handleAccept = async () => {
    if (targetUserId) {
      await toggleChatFollow(targetUserId);
      setFollowingState(true);
      toast.success("Caçador aceite! O chat está livre.");
    }
  }

  const executeClearChat = async () => {
    setIsSubmittingModal(true);
    setMessages([]);
    await clearChatMessages(channelId);
    toast.success("Limpeza efetuada com sucesso.");
    setIsSubmittingModal(false);
    setModalState('none');
    if (isPrivate) router.push('/chat');
  }

  const executeReport = async () => {
    if (!reportReason.trim()) return toast.error("Por favor, descreva o motivo da denúncia.");
    setIsSubmittingModal(true);
    const res = await submitUserReport(chatTitle, reportReason);
    if (res.success) toast.success(res.success);
    else toast.error(res.error || "Erro ao denunciar.");
    setIsSubmittingModal(false);
    setModalState('none');
    setReportReason('');
  }

  const handleDeleteSingleMessage = async (msgId: string) => {
    setMessages(prev => prev.filter(m => m.id !== msgId));
    await deleteSingleMessage(msgId);
  }

  const showSecurityBanner = isPrivate && !followingState && messages.length > 0;
  const deleteBtnText = isPrivate ? 'Apagar Conversa' : (isAdmin ? 'Apagar Chat Global (Admin)' : 'Apagar Minhas Mensagens');

  // 🔥 SE O MODO FOCO ESTIVER LIGADO, PROTEGE O ECRÃ
  if (isFocusMode) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-surface/40 backdrop-blur-xl md:border border-white/5 md:rounded-4xl rounded-3xl p-6 text-center shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-red-500/5 z-0 pointer-events-none"></div>
        <FaVideoSlash className="text-6xl text-red-500 mb-6 animate-pulse drop-shadow-[0_0_15px_rgba(239,68,68,0.5)] relative z-10" />
        <h2 className="text-2xl font-black text-white mb-2 tracking-tight relative z-10">Modo Streamer Ativado</h2>
        <p className="text-gray-400 text-sm max-w-sm leading-relaxed relative z-10">As conversas e notificações foram ocultadas para garantir o seu foco total e proteger a sua privacidade. Desative o modo no topo da página para voltar.</p>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col w-full h-full min-h-0 max-h-full bg-surface/40 backdrop-blur-xl md:border border-white/5 md:rounded-4xl rounded-3xl overflow-hidden shadow-2xl relative">
        <div className="bg-background/80 backdrop-blur-md border-b border-white/5 p-4 flex items-center justify-between z-30 shadow-sm shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            <label htmlFor="mobile-sidebar" className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white cursor-pointer transition-colors active:scale-90">
              <FaBars className="text-2xl" />
            </label>
            <div className="w-10 h-10 md:w-12 md:h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-xl border border-primary/20 shadow-inner shrink-0 relative">
              {icon}
              {isMuted && <div className="absolute -bottom-1 -right-1 bg-surface border border-white/10 rounded-full p-0.5"><FaVolumeMute className="text-[10px] text-red-400" /></div>}
            </div>
            <div className="min-w-0">
              <h2 className="font-black text-white text-base md:text-lg tracking-tight truncate flex items-center gap-2">
                {chatTitle}
                {isArchived && <span className="bg-gray-700 text-white text-[9px] px-1.5 py-0.5 rounded uppercase tracking-widest">Arquivado</span>}
              </h2>
              <p className="text-[10px] text-primary font-black uppercase tracking-[0.2em] truncate">{chatSubtitle}</p>
            </div>
          </div>

          <div className="relative">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 md:p-3 text-gray-400 hover:text-white transition-colors rounded-xl hover:bg-white/10 active:scale-90">
              <FaEllipsisV />
            </button>

            {isMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)}></div>
                <div className="absolute right-0 top-full mt-2 w-56 md:w-64 bg-surface/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 origin-top-right flex flex-col p-1.5">
                  {isPrivate && (
                    <>
                      <Link href={`/profile/${chatTitle}`} className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-300 hover:bg-white/5 hover:text-white transition-colors rounded-xl">
                        <FaUserCircle className="text-gray-400 text-lg" /> Ver Perfil
                      </Link>
                      <button onClick={handleToggleMute} className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-300 hover:bg-white/5 hover:text-white transition-colors rounded-xl w-full text-left">
                        {isMuted ? <><FaVolumeUp className="text-green-400 text-lg" /> Tirar Silêncio</> : <><FaVolumeMute className="text-red-400 text-lg" /> Silenciar Chat</>}
                      </button>
                      <button onClick={handleToggleArchive} className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-300 hover:bg-white/5 hover:text-white transition-colors rounded-xl w-full text-left">
                        {isArchived ? <><FaBoxOpen className="text-blue-400 text-lg" /> Desarquivar</> : <><FaArchive className="text-gray-400 text-lg" /> Arquivar Conversa</>}
                      </button>
                      <div className="h-px bg-white/5 my-1.5 mx-2"></div>
                    </>
                  )}

                  <button onClick={() => { setIsMenuOpen(false); setModalState('delete'); }} className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors rounded-xl w-full text-left">
                    <FaTrash className="opacity-80 text-lg" /> {deleteBtnText}
                  </button>

                  {isPrivate && (
                    <button onClick={() => { setIsMenuOpen(false); setModalState('report'); }} className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-orange-400 hover:bg-orange-500/10 hover:text-orange-300 transition-colors rounded-xl w-full text-left mt-1">
                      <FaUserShield className="opacity-80 text-lg" /> Denunciar
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {showSecurityBanner && (
          <div className="bg-background/95 border-b border-white/5 p-4 flex flex-col md:flex-row items-center justify-between gap-4 z-20 shrink-0 shadow-lg animate-in slide-in-from-top-4">
            <div className="flex items-center gap-3">
              <FaShieldAlt className="text-3xl text-red-400 shrink-0" />
              <p className="text-xs text-gray-300 font-medium leading-relaxed">Você não conhece <strong className="text-white">{chatTitle}</strong>. Aceite a ligação para libertar o chat.</p>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <button onClick={handleAccept} className="flex-1 md:flex-none px-4 py-2.5 bg-primary hover:bg-blue-500 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95">Aceitar</button>
              <button onClick={() => setModalState('delete')} className="flex-1 md:flex-none px-4 py-2.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all active:scale-95">Bloquear</button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto min-h-0 p-4 md:p-6 space-y-6 custom-scrollbar bg-black/10">
          {messages.map((msg) => {
            const isMe = currentUserId === msg.user_id;
            return (
              <div key={msg.id} className={`flex gap-3 animate-in fade-in slide-in-from-bottom-2 group/msg ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                <Link href={`/profile/${msg.users?.username}`} className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-white/10 bg-surface relative hover:border-primary transition-all shadow-md mt-auto mb-1">
                  {msg.users?.avatar_url ? <Image src={msg.users.avatar_url} alt="Avatar" fill className="object-cover hover:scale-110 transition-transform" unoptimized /> : <span className="flex items-center justify-center w-full h-full font-black text-primary text-xs bg-primary/5">{msg.users?.username?.charAt(0).toUpperCase()}</span>}
                </Link>

                <div className={`relative flex flex-col w-full max-w-[85%] md:max-w-[70%] ${isMe ? 'items-end' : 'items-start'} min-w-0`}>
                  <div className={`flex items-baseline gap-2 mb-1.5 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                    <Link href={`/profile/${msg.users?.username}`} className="font-bold text-gray-300 text-xs hover:text-primary transition-colors truncate">{msg.users?.username}</Link>
                    <span className="text-[9px] font-bold text-gray-500 uppercase tracking-tighter shrink-0">{new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className={`px-4 py-3 rounded-2xl text-sm shadow-sm leading-relaxed wrap-break-word transition-all ${isMe ? 'bg-primary border border-primary/30 text-white rounded-br-none shadow-primary/20' : 'bg-surface/80 border border-white/5 text-gray-200 rounded-bl-none'}`}>
                    {msg.content}
                  </div>
                  {isMe && (
                    <button onClick={() => handleDeleteSingleMessage(msg.id)} className="absolute top-1/2 -translate-y-1/2 -left-8 md:-left-10 opacity-0 group-hover/msg:opacity-100 p-2 text-gray-500 hover:text-red-500 transition-all bg-surface border border-white/10 rounded-xl shadow-md active:scale-90" title="Apagar Mensagem">
                      <FaTrash className="text-[10px] md:text-xs" />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full opacity-40">
              <FaRegComments className="text-5xl mb-4 text-gray-500" />
              <p className="text-xs font-black uppercase tracking-widest text-gray-400">O silêncio reina aqui...</p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {currentUserId ? (
          <form onSubmit={handleSend} className="bg-background/90 backdrop-blur-xl border-t border-white/5 p-3 md:p-4 flex gap-3 z-20 shrink-0">
            <input type="text" disabled={showSecurityBanner} value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder={showSecurityBanner ? "Aceite o chat para responder..." : "Escreva a sua mensagem..."} className="flex-1 w-full bg-surface border border-white/10 rounded-xl px-4 py-3 md:py-3.5 text-sm text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-inner placeholder:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed" maxLength={500} />
            <button type="submit" disabled={loading || !newMessage.trim() || showSecurityBanner} className="w-12 h-12 md:w-auto md:h-auto md:px-8 py-3 bg-primary text-white font-black text-sm rounded-xl hover:bg-primary/80 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale shrink-0 flex items-center justify-center gap-2">
              {loading ? <FaSpinner className="animate-spin text-lg" /> : <FaPaperPlane className="text-lg md:text-sm" />}
              <span className="hidden md:inline uppercase tracking-widest text-xs">Enviar</span>
            </button>
          </form>
        ) : (
          <div className="bg-background/60 backdrop-blur-md border-t border-white/5 p-6 text-center animate-pulse shrink-0">
            <p className="text-gray-400 font-black text-xs uppercase tracking-[0.2em]">Inicie sessão para conversar.</p>
          </div>
        )}
      </div>

      {modalState !== 'none' && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => !isSubmittingModal && setModalState('none')}></div>

          <div className="bg-surface border border-white/10 p-6 md:p-8 rounded-4xl w-full max-w-md relative z-10 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-xl font-black flex items-center gap-2 ${modalState === 'delete' ? 'text-red-500' : 'text-orange-400'}`}>
                {modalState === 'delete' ? <FaTrash /> : <FaUserShield />}
                {modalState === 'delete' ? 'Limpar Mensagens' : 'Denunciar Caçador'}
              </h3>
              <button onClick={() => !isSubmittingModal && setModalState('none')} className="text-gray-500 hover:text-white transition-colors"><FaTimes /></button>
            </div>

            {modalState === 'delete' && (
              <>
                <p className="text-sm text-gray-300 leading-relaxed mb-8">
                  {isPrivate ? "Esta ação apagará toda a conversa de forma permanente." : (isAdmin ? "Cuidado: Como Administrador, isto apagará todo o Chat Global para todos." : "Isto apagará apenas as mensagens que você enviou neste chat. Ninguém mais conseguirá vê-las.")}
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setModalState('none')} disabled={isSubmittingModal} className="flex-1 py-3.5 bg-background border border-white/10 rounded-xl text-white font-bold text-sm hover:bg-white/5 transition-all disabled:opacity-50">Cancelar</button>
                  <button onClick={executeClearChat} disabled={isSubmittingModal} className="flex-1 py-3.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center">
                    {isSubmittingModal ? <FaSpinner className="animate-spin" /> : 'Confirmar'}
                  </button>
                </div>
              </>
            )}

            {modalState === 'report' && (
              <>
                <p className="text-xs text-gray-400 mb-4">Você está prestes a reportar <strong className="text-white">{chatTitle}</strong>. Descreva o motivo (spam, ofensas, bots):</p>
                <textarea
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  disabled={isSubmittingModal}
                  placeholder="Explique o que aconteceu..."
                  className="w-full bg-background border border-white/10 rounded-2xl p-4 text-sm text-white focus:border-orange-500 outline-none h-32 resize-none custom-scrollbar mb-6 disabled:opacity-50"
                />
                <div className="flex gap-3">
                  <button onClick={() => setModalState('none')} disabled={isSubmittingModal} className="flex-1 py-3.5 bg-background border border-white/10 rounded-xl text-white font-bold text-sm hover:bg-white/5 transition-all disabled:opacity-50">Cancelar</button>
                  <button onClick={executeReport} disabled={isSubmittingModal || !reportReason.trim()} className="flex-1 py-3.5 bg-orange-500 text-white rounded-xl font-black text-sm transition-all shadow-md active:scale-95 disabled:opacity-50 disabled:grayscale flex items-center justify-center">
                    {isSubmittingModal ? <FaSpinner className="animate-spin" /> : 'Enviar Denúncia'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}