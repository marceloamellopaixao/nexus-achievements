'use client'

import { useState } from 'react'
import { addShopItem, distributeCoinsToAll, performGlobalReset, setGlobalAnnouncement } from './actions'
import { toast } from 'react-toastify'

export default function AdminClientPage() {
    const [loading, setLoading] = useState(false)
    const [coinAmount, setCoinAmount] = useState('')
    const [announcement, setAnnouncement] = useState({ message: '', type: 'info' })

    // Estados do Formulário de Itens
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        category: 'Fundos Animados',
        rarity: 'comum',
        style: ''
    })

    async function handleAddItem(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        const res = await addShopItem(formData)

        if (res.success) {
            toast.success(res.success, { theme: 'dark' })
            setFormData({ name: '', price: '', category: 'Fundos Animados', rarity: 'comum', style: '' })
        } else {
            toast.error(res.error)
        }
        setLoading(false)
    }

    // Handlers
    async function handleDistribute() {
        setLoading(true)
        const res = await distributeCoinsToAll(Number(coinAmount))
        if (res.success) toast.success(res.success); setCoinAmount('')
        setLoading(false)
    }

    async function handleBroadcast(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        const res = await setGlobalAnnouncement(announcement.message, announcement.type)
        if (res.success) toast.success(res.success)
        setLoading(false)
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

            {/* FORMULÁRIO DE CRIAÇÃO */}
            <div className="bg-surface/40 border border-border p-8 rounded-[2.5rem] shadow-2xl space-y-6">
                <h2 className="text-xl font-black text-white flex items-center gap-3">
                    <span>✨</span> Novo Item na Vitrine
                </h2>

                <form onSubmit={handleAddItem} className="space-y-4">
                    <div>
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Nome do Item</label>
                        <input
                            type="text" required placeholder="Ex: Galáxia Carmesim"
                            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-white focus:border-primary outline-none"
                            value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Preço (Moedas)</label>
                            <input
                                type="number" required placeholder="500"
                                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-white focus:border-primary outline-none"
                                value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Raridade</label>
                            <select
                                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-white focus:border-primary outline-none"
                                value={formData.rarity} onChange={e => setFormData({ ...formData, rarity: e.target.value })}
                            >
                                <option value="comum">Comum</option>
                                <option value="raro">Raro</option>
                                <option value="epico">Épico</option>
                                <option value="lendario">Lendário</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Categoria</label>
                        <select
                            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-white focus:border-primary outline-none"
                            value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}
                        >
                            <option value="Fundos Animados">Fundo Animado</option>
                            <option value="Molduras de Avatar">Moldura de Avatar</option>
                            <option value="Títulos Exclusivos">Título Exclusivo</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-1">Estilo CSS (Gradient/Border)</label>
                        <textarea
                            required placeholder="linear-gradient(...)"
                            className="w-full bg-background border border-border rounded-xl px-4 py-3 text-white focus:border-primary outline-none h-24 font-mono text-xs"
                            value={formData.style} onChange={e => setFormData({ ...formData, style: e.target.value })}
                        />
                    </div>

                    <button
                        type="submit" disabled={loading}
                        className="w-full py-4 bg-primary hover:bg-blue-600 text-white font-black rounded-2xl transition-all shadow-lg active:scale-95 disabled:opacity-50"
                    >
                        Adicionar à Loja
                    </button>
                </form>
            </div>

            {/* 📢 BROADCAST & EVENTOS */}
            <div className="bg-surface/40 border border-border p-8 rounded-[2.5rem] shadow-2xl space-y-6">
                <h2 className="text-xl font-black text-white flex items-center gap-3"><span>📢</span> Broadcast Global</h2>
                <form onSubmit={handleBroadcast} className="space-y-4">
                    <textarea
                        placeholder="Mensagem para todos os usuários (deixe vazio para remover)..."
                        className="w-full bg-background border border-border rounded-2xl px-4 py-4 text-white outline-none h-28 italic"
                        value={announcement.message} onChange={e => setAnnouncement({ ...announcement, message: e.target.value })}
                    />
                    <div className="flex gap-4">
                        <select
                            className="flex-1 bg-background border border-border rounded-xl px-4 py-2 text-white"
                            value={announcement.type} onChange={e => setAnnouncement({ ...announcement, type: e.target.value })}
                        >
                            <option value="info">ℹ️ Informação</option>
                            <option value="event">🔥 Evento Especial</option>
                            <option value="warning">⚠️ Manutenção</option>
                        </select>
                        <button className="px-8 py-3 bg-white text-black font-black rounded-xl hover:scale-105 transition-all">Publicar</button>
                    </div>
                </form>
            </div>

            {/* 💰 BANCO CENTRAL */}
            <div className="bg-surface/40 border border-border p-8 rounded-[2.5rem] shadow-2xl space-y-6">
                <h2 className="text-xl font-black text-white flex items-center gap-3"><span>🏦</span> Banco Central do Nexus</h2>
                <div className="p-6 bg-yellow-500/5 border border-yellow-500/20 rounded-3xl space-y-4">
                    <p className="text-xs text-gray-400 font-medium italic text-center">Injete Nexus Coins na economia para celebrar marcos da comunidade.</p>
                    <div className="flex gap-3">
                        <input
                            type="number" placeholder="Quantia de moedas"
                            className="flex-1 bg-background border border-border rounded-xl px-4 py-3 text-white text-center font-mono"
                            value={coinAmount} onChange={e => setCoinAmount(e.target.value)}
                        />
                        <button
                            onClick={handleDistribute} disabled={loading}
                            className="px-6 bg-yellow-500 text-black font-black rounded-xl hover:bg-yellow-400 transition-all disabled:opacity-50"
                        >
                            Distribuir a Todos
                        </button>
                    </div>
                </div>
            </div>

            {/* ZONA DE PERIGO & RESET (Lado Esquerdo Inferior) */}
            <div className="bg-red-500/5 border border-red-500/20 p-8 rounded-[2.5rem] space-y-4">
                <h3 className="text-red-500 font-black text-sm uppercase tracking-widest">Danger Zone</h3>
                <button
                    onClick={() => performGlobalReset()}
                    className="w-full py-4 border-2 border-red-500/30 text-red-500 rounded-2xl font-black hover:bg-red-500 hover:text-white transition-all"
                >
                    RESET TOTAL DO SISTEMA
                </button>
            </div>

        </div>
    )
}