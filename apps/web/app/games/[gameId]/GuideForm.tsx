'use client'

import { useState, useRef } from 'react'
import { createGuide, uploadGuideImage } from './actions'
import { toast } from 'react-toastify'

export default function GuideForm({ gameId }: { gameId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploadingImg, setUploadingImg] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const res = await createGuide(gameId, title, content)
    
    if (res.error) {
      toast.error(res.error, { theme: 'dark' })
    } else {
      toast.success('Guia publicado com sucesso!', { theme: 'dark', icon: <span>📚</span> })
      setTitle('')
      setContent('')
      setIsOpen(false)
    }
    setLoading(false)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Limite de tamanho (Ex: 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem é muito grande. O limite é 5MB.', { theme: 'dark' })
      return
    }

    setUploadingImg(true)
    const formData = new FormData()
    formData.append('image', file)

    const res = await uploadGuideImage(formData)
    
    if (res.error) {
      toast.error(res.error, { theme: 'dark' })
    } else if (res.url) {
      // Insere a imagem no formato Markdown onde o cursor estiver (ou no final do texto)
      const imageTag = `\n![Imagem](${res.url})\n`
      setContent(prev => prev + imageTag)
      toast.success('Imagem inserida no guia!', { theme: 'dark' })
    }
    
    setUploadingImg(false)
    if (fileInputRef.current) fileInputRef.current.value = '' // Limpa o input
  }

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="w-full py-4 border-2 border-dashed border-border rounded-2xl text-gray-400 font-bold hover:text-white hover:border-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
      >
        <span>✍️</span> Escrever um Guia de Platina
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-surface border border-border p-6 rounded-2xl animate-in fade-in zoom-in-95 duration-200 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-white">Novo Guia</h3>
        <button type="button" onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-white">✕</button>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Título do Guia ou Troféu</label>
          <input 
            type="text" required value={title} onChange={e => setTitle(e.target.value)}
            placeholder="Ex: Como derrotar o Boss X / Guia da Conquista Y"
            className="w-full bg-background border border-border rounded-xl p-3 text-white focus:outline-none focus:border-primary transition-colors"
          />
        </div>
        
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold text-gray-400 uppercase">Passo a Passo (Dicas)</label>
            
            {/* O BOTÃO DE UPLOAD FICA AQUI */}
            <input type="file" accept="image/*" hidden ref={fileInputRef} onChange={handleImageUpload} />
            <button 
              type="button" 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImg}
              className="text-xs font-bold bg-primary/20 text-primary px-3 py-1 rounded-lg hover:bg-primary hover:text-white transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              {uploadingImg ? 'A carregar...' : '🖼️ Inserir Imagem'}
            </button>
          </div>
          
          <textarea 
            required value={content} onChange={e => setContent(e.target.value)}
            placeholder="Partilha a tua sabedoria... Clica em Inserir Imagem para demonstrar locais e rotas!"
            rows={8}
            className="w-full bg-background border border-border rounded-xl p-3 text-white focus:outline-none focus:border-primary transition-colors resize-none"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => setIsOpen(false)} className="px-6 py-2 rounded-xl text-sm font-bold text-gray-400 hover:text-white transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={loading || uploadingImg} className="px-6 py-2 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/80 transition-colors disabled:opacity-50">
            {loading ? 'A publicar...' : 'Publicar Guia'}
          </button>
        </div>
      </div>
    </form>
  )
}