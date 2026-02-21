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
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm("Deseja apagar este recado?")) return;
    setIsDeleting(true);
    // Aqui chama a sua server action de delete
    await deleteComment(commentId, currentPath);
    setIsDeleting(false);
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all active:scale-90 disabled:opacity-50"
      title="Apagar recado"
    >
      {isDeleting ? (
        <span className="animate-spin block text-xs">🌀</span>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      )}
    </button>
  );
}