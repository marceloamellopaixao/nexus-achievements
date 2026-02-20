'use client'

import React, { useState } from 'react'
import { updateProfile } from '../actions'
import { toast } from 'react-toastify'
import { useRouter } from 'next/navigation'

type Props = {
  initialUsername: string;
  initialBio: string;
}

export default function ProfileForm({ initialUsername, initialBio }: Props) {
  const [username, setUsername] = useState(initialUsername || '')
  const [bio, setBio] = useState(initialBio || '')
  const [saving, setSaving] = useState(false)
  const router = useRouter()

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    const result = await updateProfile(username, bio)

    if (result?.error) {
      toast.error(result.error, { theme: 'dark' })
    } else if (result?.success) {
      toast.success(result.message, { theme: 'dark', icon: () => <span>💾</span> })
      router.refresh()
    }
    setSaving(false)
  }

  return (
    <form onSubmit={handleSave} className="bg-surface/50 border border-border p-6 rounded-2xl space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-xl font-bold text-white">📝 Informações Básicas</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Nome de Usuário (Nickname)</label>
          <input 
            type="text" 
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary transition-colors"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Sua Bio</label>
          <input 
            type="text" 
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Conte um pouco sobre seus jogos favoritos..."
            className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button 
          type="submit" 
          disabled={saving}
          className="bg-white hover:bg-gray-200 text-black rounded-lg px-6 py-2.5 font-bold text-sm transition-colors disabled:opacity-50"
        >
          {saving ? 'Salvando...' : 'Salvar Informações'}
        </button>
      </div>
    </form>
  )
}