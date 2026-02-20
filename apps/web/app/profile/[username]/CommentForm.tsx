'use client'

import { useState } from 'react'
import { postComment, deleteComment } from './actions'
import { toast } from 'react-toastify'

export function CommentInput({ profileId, currentPath }: { profileId: string, currentPath: string }) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    setLoading(true)
    const res = await postComment(profileId, content, currentPath)
    if (res.error) {
      toast.error(res.error, { theme: 'dark' })
    } else {
      toast.success("Recado enviado com sucesso!", { theme: 'dark', icon: <span className="text-lg">💬</span> })
      setContent('')
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="mb-4 pb-4 border-b border-border/50">
      <textarea 
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Deixe um recado para este caçador..." 
        className="w-full bg-background border border-border rounded-lg p-3 text-sm text-white focus:outline-none focus:border-primary resize-none transition-colors"
        rows={2}
        required
      ></textarea>
      <button 
        type="submit"
        disabled={loading || !content.trim()}
        className="mt-2 w-full py-2 bg-primary/20 text-primary font-bold text-xs rounded-lg hover:bg-primary hover:text-white transition-colors disabled:opacity-50"
      >
        {loading ? 'A enviar...' : 'Enviar Recado'}
      </button>
    </form>
  )
}

export function DeleteCommentButton({ commentId, currentPath }: { commentId: string, currentPath: string }) {
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    if(!confirm("Apagar este recado?")) return;
    setLoading(true)
    const res = await deleteComment(commentId, currentPath)
    if (res.error) toast.error(res.error, { theme: 'dark' })
    setLoading(false)
  }

  return (
    <button onClick={handleDelete} disabled={loading} className="text-gray-500 hover:text-red-400 text-xs p-1 transition-colors" title="Apagar">
      🗑️
    </button>
  )
}