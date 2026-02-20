'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { updateProfile } from '../actions'
import { toast } from 'react-toastify'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function EditProfilePage() {
    const [username, setUsername] = useState('')
    const [bio, setBio] = useState('')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const router = useRouter()

    // Busca os dados atuais assim que a página carrega
    useEffect(() => {
        const supabase = createClient()

        async function loadUser() {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data } = await supabase
                    .from('users')
                    .select('username, bio')
                    .eq('id', user.id)
                    .single()

                if (data) {
                    setUsername(data.username || '')
                    setBio(data.bio || '')
                }
            }
            setLoading(false)
        }
        loadUser()
    }, [])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        const result = await updateProfile(username, bio)

        if (result?.error) {
            toast.error(result.error, { theme: 'dark' })
        } else if (result?.success) {
            toast.success(result.message, { theme: 'dark', icon: () => <span>💾</span> })
            router.push('/profile') // Redireciona de volta para o perfil
        }
        setSaving(false)
    }

    if (loading) return <div className="p-10 text-center text-gray-400">Carregando dados...</div>

    return (
        <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500 pb-10">
            <div>
                <h2 className="text-3xl font-bold text-white tracking-tight">Editar Perfil</h2>
                <p className="text-gray-400 mt-1">Personalize como a comunidade do Nexus vê você.</p>
            </div>

            <form onSubmit={handleSave} className="bg-surface border border-border p-6 rounded-2xl space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Nome de Usuário (Nickname)
                    </label>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors"
                        required
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                        Sua Bio
                    </label>
                    <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        rows={4}
                        placeholder="Conte um pouco sobre seus jogos favoritos..."
                        className="w-full bg-background border border-border rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary transition-colors resize-none"
                    />
                </div>

                <div className="flex items-center gap-4 pt-4 border-t border-border">
                    <Link href="/profile" className="px-6 py-3 text-gray-400 hover:text-white transition-colors font-medium text-sm">
                        Cancelar
                    </Link>
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex-1 bg-primary hover:bg-primary/80 text-white rounded-lg px-6 py-3 font-bold text-sm transition-colors disabled:opacity-50"
                    >
                        {saving ? 'Salvando...' : 'Salvar Alterações'}
                    </button>
                </div>
            </form>
        </div>
    )
}