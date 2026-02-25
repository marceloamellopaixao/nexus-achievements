'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { FaImage, FaSpinner, FaUpload, FaLink, FaTimes } from 'react-icons/fa'
import { toast } from 'react-toastify'
import { uploadGameCustomization } from './actions'

interface Props {
  gameId: string;
  type: 'banner' | 'cover';
  className?: string;
}

// 1. Criamos um tipo para o resultado do upload para remover o "any"
interface UploadResult {
  success?: string;
  error?: string;
}

export default function CustomizationButton({ gameId, type, className = "" }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [imageUrl, setImageUrl] = useState('')
  const [mounted, setMounted] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Previne erros de "Hydration" do Next.js ao usar Portals
  useEffect(() => setMounted(true), [])

  // 2. Trocamos "any" por "UploadResult"
  const processResult = (res: UploadResult) => {
    if (res.success) {
      toast.success(res.success, { theme: 'dark' })
      setIsOpen(false)
      setImageUrl('')
    } else if (res.error) {
      toast.error(res.error, { theme: 'dark' })
    }
  }

  // --- OPÇÃO 1: Ficheiro do Computador ---
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione um ficheiro de imagem válido.', { theme: 'dark' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem não pode ter mais de 5MB.', { theme: 'dark' });
      return;
    }

    setLoading(true)
    const formData = new FormData()
    formData.append('image', file)

    const res = await uploadGameCustomization(gameId, type, formData, null)
    processResult(res)
    
    setLoading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // --- OPÇÃO 2: Colar URL (SteamGridDB, etc) ---
  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!imageUrl.trim()) return;

    setLoading(true)
    const res = await uploadGameCustomization(gameId, type, null, imageUrl.trim())
    processResult(res)
    setLoading(false)
  }

  const modalContent = (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay Escuro (Fecha ao clicar fora) */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => !loading && setIsOpen(false)}></div>
      
      <div className="bg-surface border border-white/10 p-6 md:p-8 rounded-4xl w-full max-w-sm relative z-10 shadow-2xl animate-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-black text-white flex items-center gap-2">
            <FaImage className="text-primary" /> Editar {type === 'banner' ? 'Banner' : 'Capa'}
          </h3>
          <button onClick={() => !loading && setIsOpen(false)} className="text-gray-500 hover:text-white transition-colors p-1">
            <FaTimes />
          </button>
        </div>

        <div className="space-y-6">
          
          {/* Opção 1 */}
          <div>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Opção 1: Arquivo (Max 5MB)</p>
            <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="w-full py-3 bg-surface/50 hover:bg-white/5 border border-white/10 rounded-xl flex items-center justify-center gap-2 font-bold text-sm text-white transition-colors active:scale-95 disabled:opacity-50 shadow-inner"
            >
              {loading ? <FaSpinner className="animate-spin" /> : <FaUpload className="text-primary" />} 
              Enviar do Computador
            </button>
          </div>

          <div className="flex items-center gap-3 opacity-50">
            <div className="h-px bg-white/20 flex-1"></div>
            <span className="text-[9px] font-black uppercase tracking-widest text-white">Ou</span>
            <div className="h-px bg-white/20 flex-1"></div>
          </div>

          {/* Opção 2 */}
          <form onSubmit={handleUrlSubmit}>
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">Opção 2: Link (SteamGridDB)</p>
            <div className="flex flex-col gap-3">
              <div className="relative">
                <FaLink className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                <input 
                  type="url" 
                  placeholder="https://..." 
                  required
                  value={imageUrl}
                  onChange={e => setImageUrl(e.target.value)}
                  disabled={loading}
                  className="w-full bg-background border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-sm text-white focus:border-primary outline-none transition-colors shadow-inner disabled:opacity-50"
                />
              </div>
              <button 
                type="submit" 
                disabled={loading || !imageUrl.trim()}
                className="w-full py-3.5 bg-primary text-white rounded-xl font-black text-sm hover:bg-primary/80 transition-colors disabled:opacity-50 disabled:grayscale active:scale-95 flex items-center justify-center gap-2 shadow-md hover:shadow-primary/30"
              >
                {loading ? <FaSpinner className="animate-spin" /> : null} Salvar Link Externo
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  )

  return (
    <>
      <button 
        onClick={(e) => { e.preventDefault(); setIsOpen(true); }}
        title={`Alterar ${type} do jogo`}
        className={`bg-background/80 backdrop-blur-md border border-white/20 text-white p-2 md:p-3 rounded-xl hover:bg-primary hover:border-primary transition-all shadow-xl active:scale-90 flex items-center justify-center ${className}`}
      >
        <FaImage className="text-sm md:text-base drop-shadow-md" />
      </button>

      {isOpen && mounted && createPortal(modalContent, document.body)}
    </>
  )
}