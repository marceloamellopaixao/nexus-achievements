'use client'

import { useState } from 'react'
import { postComment, deleteComment } from './actions'
import { toast } from 'react-toastify'
import { FaPaperPlane, FaSpinner, FaTrashAlt } from "react-icons/fa";

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
      toast.success("Recado enviado com sucesso!", { theme: 'dark' })
      setContent('') 
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="mb-2 w-full">
      <div className="relative">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Deixe um recado para este caçador..."
          className="w-full bg-background/60 border border-white/10 rounded-2xl p-4 pr-4 pb-8 text-sm text-white font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none transition-all shadow-inner custom-scrollbar"
          rows={3}
          maxLength={MAX_CHARS}
          required
        ></textarea>
        <div className={`absolute bottom-3 right-4 text-[10px] font-bold ${content.length >= MAX_CHARS ? 'text-red-400' : 'text-gray-500'}`}>
          {content.length}/{MAX_CHARS}
        </div>
      </div>

      <div className="flex justify-end mt-3">
        <button
          type="submit"
          disabled={loading || !content.trim() || content.length > MAX_CHARS}
          className="flex items-center justify-center gap-2 w-full sm:w-auto px-6 py-3 bg-primary/10 text-primary border border-primary/20 font-black text-xs md:text-sm rounded-xl hover:bg-primary hover:text-white transition-all disabled:opacity-50 hover:shadow-[0_0_15px_rgba(59,130,246,0.3)] active:scale-95"
        >
          {loading ? <FaSpinner className="animate-spin text-lg" /> : <FaPaperPlane className="text-sm" />}
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
    await deleteComment(commentId, currentPath);
    setIsDeleting(false);
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="p-2.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all active:scale-90 disabled:opacity-50 bg-background/50 border border-transparent hover:border-red-500/20 shadow-sm"
      title="Apagar recado"
    >
      {isDeleting ? (
        <FaSpinner className="animate-spin block text-sm" />
      ) : (
        <FaTrashAlt className="text-sm" />
      )}
    </button>
  );
}