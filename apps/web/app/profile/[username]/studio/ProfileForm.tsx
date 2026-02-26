'use client'

import React, { useState, useRef } from 'react'
import { updateProfile, uploadProfileImage } from './actions'
import { toast } from 'react-toastify'
import Image from 'next/image'
import { FaCamera, FaSave } from 'react-icons/fa'

type Props = {
  initialUsername: string;
  initialBio: string;
  initialAvatar: string | null;
  initialBanner: string | null;
  globalLevel?: number;
  equippedTitle?: { name: string; tag_style?: string | null } | null;
  equippedBorder?: { border_style?: string | null } | null;
}

export default function ProfileForm({ 
  initialUsername, 
  initialBio, 
  initialAvatar, 
  initialBanner, 
  globalLevel = 1, 
  equippedTitle, 
  equippedBorder 
}: Props) {
  const [username, setUsername] = useState(initialUsername || '')
  const [bio, setBio] = useState(initialBio || '')
  const [avatarUrl, setAvatarUrl] = useState(initialAvatar)
  const [bannerUrl, setBannerUrl] = useState(initialBanner)
  const [saving, setSaving] = useState(false)
  
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  const handleSaveText = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const result = await updateProfile(username, bio)
    if (result?.error) toast.error(result.error, { theme: 'dark' })
    else if (result?.success) toast.success(result.message, { theme: 'dark', icon: <FaSave className="text-blue-400" /> })
    setSaving(false)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'banner') => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) return toast.error("A imagem não pode ter mais de 5MB.");

    const formData = new FormData();
    formData.append('image', file);

    const toastId = toast.loading(`A enviar ${type === 'avatar' ? 'foto' : 'fundo'}...`, { theme: 'dark' });
    
    const res = await uploadProfileImage(formData, type);
    if (res.success && res.url) {
      toast.update(toastId, { render: res.success, type: 'success', isLoading: false, autoClose: 3000, theme: 'dark' });
      if (type === 'avatar') setAvatarUrl(res.url);
      else setBannerUrl(res.url);
    } else {
      toast.update(toastId, { render: res.error, type: 'error', isLoading: false, autoClose: 3000, theme: 'dark' });
    }
  }

  return (
    <div className="space-y-8">
      {/* EDITOR VISUAL DE FOTOS E IDENTIDADE */}
      <div className="relative w-full h-48 md:h-64 bg-background border border-white/10 rounded-4xl overflow-hidden group/banner shadow-inner">
        {bannerUrl ? (
          <Image src={bannerUrl} fill className="object-cover opacity-80" alt="Banner" unoptimized />
        ) : (
          <div className="absolute inset-0 bg-linear-to-tr from-surface to-background flex items-center justify-center">
            <span className="text-gray-600 font-bold uppercase tracking-widest text-xs">Sem Fundo</span>
          </div>
        )}
        
        <div className="absolute inset-0 bg-linear-to-t from-background via-background/20 to-transparent opacity-80 pointer-events-none"></div>

        <div onClick={() => bannerInputRef.current?.click()} className="absolute inset-0 bg-black/60 opacity-0 group-hover/banner:opacity-100 transition-opacity flex items-center justify-center cursor-pointer backdrop-blur-sm z-10">
          <div className="flex flex-col items-center text-white">
            <FaCamera className="text-3xl mb-2 drop-shadow-md" />
            <span className="font-black text-sm uppercase tracking-widest drop-shadow-md">Alterar Fundo</span>
          </div>
        </div>
        <input type="file" accept="image/*" ref={bannerInputRef} onChange={(e) => handleImageUpload(e, 'banner')} className="hidden" />

        <div className="absolute bottom-3 md:bottom-5 left-4 md:left-8 z-20 flex items-end gap-4 md:gap-5 pointer-events-none w-[calc(100%-2rem)]">
          <div className="group/avatar pointer-events-auto shrink-0">
            <div 
              className="relative w-24 h-24 md:w-32 md:h-32 rounded-3xl md:rounded-4xl p-1 shadow-2xl cursor-pointer transition-transform hover:scale-105"
              style={{ background: equippedBorder?.border_style || 'transparent' }}
              onClick={() => avatarInputRef.current?.click()}
            >
              <div className="w-full h-full rounded-[1.3rem] md:rounded-[1.8rem] bg-background border-4 border-background overflow-hidden relative">
                {avatarUrl ? (
                  <Image src={avatarUrl} fill className="object-cover" alt="Avatar" unoptimized />
                ) : (
                  <div className="w-full h-full bg-surface flex items-center justify-center text-4xl text-primary font-black">
                    {username.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                  <FaCamera className="text-2xl md:text-3xl text-white" />
                </div>
              </div>
            </div>
            <input type="file" accept="image/*" ref={avatarInputRef} onChange={(e) => handleImageUpload(e, 'avatar')} className="hidden" />
          </div>

          <div className="hidden sm:flex flex-col mb-2 drop-shadow-md min-w-0">
            <div className="flex items-center gap-3 mb-1.5 min-w-0">
              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight truncate">{username || 'GamerTag'}</h2>
              <span className="text-[10px] md:text-xs font-black bg-primary/20 text-primary border border-primary/50 px-2.5 py-1 rounded-lg uppercase tracking-wider shrink-0">
                Lvl {globalLevel}
              </span>
            </div>
            {equippedTitle?.tag_style ? (
              <span className="inline-block px-4 py-1.5 rounded-lg border border-white/20 text-xs font-black shadow-lg text-white w-fit truncate max-w-full" style={{ background: equippedTitle.tag_style }}>
                {equippedTitle.name}
              </span>
            ) : (
              <span className="text-primary font-bold text-[10px] sm:text-xs tracking-widest uppercase truncate max-w-full">
                Iniciante
              </span>
            )}
          </div>
        </div>
      </div>

      <form onSubmit={handleSaveText} className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">O seu Gamer Tag</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-500 font-bold">@</span>
            <input 
              type="text" value={username} onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
              className="w-full bg-background/80 border border-white/5 rounded-xl pl-10 pr-4 py-3.5 text-white font-bold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-inner"
              required minLength={3} maxLength={20}
            />
          </div>
          <p className="text-[10px] text-gray-500 mt-2">Letras, números e underlines (_). Sem espaços.</p>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">A sua Biografia</label>
          <input 
            type="text" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Conte um pouco sobre as suas aventuras..."
            className="w-full bg-background/80 border border-white/5 rounded-xl px-5 py-3.5 text-white font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all shadow-inner"
            maxLength={150}
          />
          <p className="text-[10px] text-gray-500 mt-2 text-right">{bio.length}/150 caracteres</p>
        </div>

        <div className="md:col-span-2 flex justify-end pt-4 border-t border-white/5">
          <button 
            type="submit" disabled={saving || username.length < 3}
            className="flex items-center justify-center gap-2 bg-white hover:bg-gray-200 text-black rounded-xl px-8 py-3.5 font-black text-sm transition-all shadow-xl hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
          >
            {saving ? 'Salvando...' : <><FaSave /> Salvar Perfil</>}
          </button>
        </div>
      </form>
    </div>
  )
}