'use client'

import { useState } from 'react'
import { toggleGuideVote, postGuideComment, deleteGuide } from './actions'
import { toast } from 'react-toastify'
import { useRouter } from 'next/navigation'
import { FaThumbsUp, FaSpinner, FaTrash, FaCommentDots } from 'react-icons/fa'

export function GuideVoteButton({ guideId, gameId, initialVotes, hasVoted }: { guideId: string, gameId: string, initialVotes: number, hasVoted: boolean }) {
  const [loading, setLoading] = useState(false)
  const [voted, setVoted] = useState(hasVoted)
  const [votesCount, setVotesCount] = useState(initialVotes)

  const handleVote = async () => {
    if (loading) return; 
    setLoading(true)

    const res = await toggleGuideVote(guideId, gameId)

    if (res.error) {
      toast.error(res.error, { theme: 'dark' })
    } else if (res.success) {
      setVoted(res.isVoted)
      setVotesCount(res.newCount)
    }

    setLoading(false)
  }

  return (
    <button
      onClick={handleVote}
      disabled={loading}
      className={`flex items-center gap-2 border px-5 py-2.5 rounded-xl font-bold transition-all disabled:opacity-50 ${voted ? 'bg-primary/20 border-primary text-primary shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'bg-background border-border text-gray-400 hover:text-primary hover:border-primary/50'}`}
    >
      {loading ? <FaSpinner className="animate-spin" /> : <FaThumbsUp className={voted ? "scale-110 transition-transform" : ""} />}
      {votesCount} Curtidas
    </button>
  )
}

export function GuideCommentForm({ guideId, gameId }: { guideId: string, gameId: string }) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return
    setLoading(true)
    const res = await postGuideComment(guideId, gameId, content)
    if (res.error) {
      toast.error(res.error, { theme: 'dark' })
    } else {
      toast.success('Comentário enviado!', { theme: 'dark', icon: <FaCommentDots className="text-blue-500" /> })
      setContent('')
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 flex flex-col md:flex-row gap-3">
      <input
        type="text"
        value={content}
        onChange={e => setContent(e.target.value)}
        required
        placeholder="Adicione um comentário para ajudar a comunidade..."
        className="flex-1 bg-surface border border-border rounded-xl p-3 text-sm text-white focus:outline-none focus:border-primary transition-colors"
      />
      <button
        type="submit"
        disabled={loading || !content.trim()}
        className="px-6 py-3 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary/80 transition-colors disabled:opacity-50 whitespace-nowrap flex items-center justify-center gap-2"
      >
        {loading ? <FaSpinner className="animate-spin" /> : null}
        {loading ? 'A enviar...' : 'Enviar'}
      </button>
    </form>
  )
}

export function DeleteGuideButton({ guideId, gameId }: { guideId: string, gameId: string }) {
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    const confirmed = window.confirm("Tem a certeza de que deseja apagar este guia? Esta ação é irreversível.")
    if (!confirmed) return

    setIsDeleting(true)
    const res = await deleteGuide(guideId, gameId)

    if (res.error) {
      toast.error(res.error, { theme: 'dark' })
      setIsDeleting(false)
    } else {
      toast.success('Guia apagado com sucesso.', { theme: 'dark' })
      router.refresh()
      router.push(`/games/${gameId}?tab=guides`)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isDeleting}
      className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl font-bold text-sm hover:bg-red-500 hover:text-white transition-all disabled:opacity-50 shadow-sm"
    >
      {isDeleting ? <FaSpinner className="animate-spin" /> : <FaTrash />}
      {isDeleting ? 'A apagar...' : 'Apagar Guia'}
    </button>
  )
}