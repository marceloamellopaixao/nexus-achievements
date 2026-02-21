'use client'

import { useState } from 'react'
import { postComment, deleteComment } from './actions'
import { toast } from 'react-toastify'

export function CommentInput({ profileId, currentPath }: { profileId: string, currentPath: string }) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const MAX_CHARS = 250;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || content.length > MAX_CHARS) return
    
    setLoading(true)
    const res = await postComment(profileId, content.trim(), currentPath)
    
    if (res?.error) {
      toast.error(res.error, { theme: 'dark' })
    } else {
      toast.success("Recado enviado com sucesso!", { theme: 'dark', icon: <span>💬</span> })
      setContent('') // Limpa o campo após enviar
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="mb-2">
      <div className="relative">
        <textarea 
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Deixe um recado para este caçador..." 
          className="w-full bg-background/50 border border-border rounded-2xl p-4 pr-4 pb-8 text-sm text-white font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none transition-all shadow-inner custom-scrollbar"
          rows={3}
          maxLength={MAX_CHARS}
          required
        ></textarea>
        {/* Contador de Caracteres no canto inferior direito */}
        <div className={`absolute bottom-3 right-4 text-[10px] font-bold ${content.length >= MAX_CHARS ? 'text-red-400' : 'text-gray-500'}`}>
          {content.length}/{MAX_CHARS}
        </div>
      </div>
      
      <div className="flex justify-end mt-3">
        <button 
          type="submit"
          disabled={loading || !content.trim() || content.length > MAX_CHARS}
          className="flex items-center gap-2 px-6 py-2.5 bg-primary/10 text-primary border border-primary/20 font-black text-xs md:text-sm rounded-xl hover:bg-primary hover:text-white transition-all disabled:opacity-50 hover:shadow-[0_0_15px_rgba(59,130,246,0.3)] active:scale-95"
        >
          {loading ? <span className="animate-spin text-lg">🔄</span> : <span className="text-lg">✉️</span>}
          {loading ? 'A enviar...' : 'Enviar Recado'}
        </button>
      </div>
    </form>
  )
}

export function DeleteCommentButton({ commentId, currentPath }: { commentId: string, currentPath: string }) {
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if(!confirm("Tem certeza que deseja apagar este recado?")) return;
    setLoading(true)
    
    const res = await deleteComment(commentId, currentPath)
    if (res?.error) {
      toast.error(res.error, { theme: 'dark' })
    } else {
      toast.success("Recado apagado.", { theme: 'dark', icon: <span>🗑️</span> })
    }
    setLoading(false)
  }

  return (
    <button 
      onClick={handleDelete} 
      disabled={loading} 
      className="flex items-center justify-center w-8 h-8 rounded-full bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white border border-transparent hover:border-red-600 transition-all shadow-sm disabled:opacity-50" 
      title="Apagar Recado"
    >
      {loading ? <span className="animate-spin text-xs">🔄</span> : <span className="text-sm">🗑️</span>}
    </button>
  )
}