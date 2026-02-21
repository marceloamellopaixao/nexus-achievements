'use client'

import React, { useState } from 'react'
import { updateProfile } from '../../actions'
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
      toast.success(result.message, { theme: 'dark', icon: <span>💾</span> })
      router.refresh()
    }
    setSaving(false)
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input Nome de Usuário */}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
            O seu Gamer Tag
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-500 font-bold">@</span>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
              className="w-full bg-background/80 border border-border rounded-xl pl-10 pr-4 py-3.5 text-white font-bold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-inner"
              required
              minLength={3}
              maxLength={20}
            />
          </div>
          <p className="text-[10px] text-gray-500 mt-2">Letras, números e underlines (_). Sem espaços.</p>
        </div>

        {/* Input Biografia */}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
            A sua Biografia
          </label>
          <input 
            type="text" 
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Conte um pouco sobre as suas aventuras..."
            className="w-full bg-background/80 border border-border rounded-xl px-5 py-3.5 text-white font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-inner"
            maxLength={150}
          />
          <p className="text-[10px] text-gray-500 mt-2 text-right">{bio.length}/150 caracteres</p>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-white/5">
        <button 
          type="submit" 
          disabled={saving || username.length < 3}
          className="flex items-center justify-center gap-2 bg-white hover:bg-gray-200 text-black rounded-xl px-8 py-3.5 font-black text-sm transition-all shadow-[0_0_15px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
        >
          {saving ? 'A guardar...' : 'Guardar Alterações'}
        </button>
      </div>
    </form>
  )
}