'use client'

import { useState, useRef } from 'react'
import { FaImage, FaSpinner } from 'react-icons/fa'
import { toast } from 'react-toastify'
import { uploadGameCustomization } from '../actions'

interface Props {
  gameId: string;
  type: 'banner' | 'cover';
  isAdmin: boolean;
  className?: string;
}

export default function CustomizationButton({ gameId, type, isAdmin, className = "" }: Props) {
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione um ficheiro de imagem válido.');
      return;
    }

    // Limite de 5MB
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem não pode ter mais de 5MB.');
      return;
    }

    setLoading(true)
    const formData = new FormData()
    formData.append('image', file)

    const res = await uploadGameCustomization(gameId, type, formData)
    
    if (res.success) {
      toast.success(res.success)
    } else {
      toast.error(res.error)
    }
    
    setLoading(false)
  }

  return (
    <>
      <input 
        type="file" 
        accept="image/*" 
        ref={fileInputRef} 
        onChange={handleFileChange} 
        className="hidden" 
      />
      <button 
        onClick={() => fileInputRef.current?.click()}
        disabled={loading}
        title={isAdmin ? `Alterar ${type} para todos (Global)` : `Personalizar ${type} (Apenas para si)`}
        className={`bg-background/80 backdrop-blur-md border border-white/20 text-white p-2 md:p-3 rounded-xl hover:bg-primary hover:border-primary transition-all shadow-xl active:scale-90 flex items-center justify-center ${className}`}
      >
        {loading ? <FaSpinner className="animate-spin text-sm md:text-base" /> : <FaImage className="text-sm md:text-base" />}
      </button>
    </>
  )
}