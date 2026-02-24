'use client'

import { useState } from 'react'
import { addShopItem, distributeCoinsToAll, performTargetedReset, setGlobalAnnouncement } from './actions'
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

    // Estados da Nova Ferramenta de Reset
    const [targetUser, setTargetUser] = useState('')
    const [resetOptions, setResetOptions] = useState({
        games: false,
        social: false,
        inventory: false,
        stats: false
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

    async function handleDistribute() {
        if(!coinAmount || Number(coinAmount) <= 0) return;
        
        setLoading(true)
        const res = await distributeCoinsToAll(Number(coinAmount))
        if (res.success) toast.success(res.success); 
        setCoinAmount('')
        setLoading(false)
    }

    async function handleBroadcast(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        const res = await setGlobalAnnouncement(announcement.message, announcement.type)
        if (res.success) toast.success(res.success)
        setLoading(false)
    }

    async function handleTargetedReset() {
        if (!targetUser) {
            toast.error("O alvo não pode estar vazio.");
            return;
        }

        const hasSelectedOption = Object.values(resetOptions).some(v => v === true);
        if (!hasSelectedOption) {
            toast.warning("Selecione pelo menos um módulo para resetar.");
            return;
        }

        if(confirm(`Tem certeza que deseja apagar os dados do utilizador: ${targetUser}? Esta ação é IRREVERSÍVEL.`)) {
            setLoading(true)
            const res = await performTargetedReset(targetUser, resetOptions);
            
            if (res.success) {
                toast.success(res.success);
                setTargetUser('');
                setResetOptions({ games: false, social: false, inventory: false, stats: false });
            } else {
                toast.error(res.error);
            }
            setLoading(false)
        }
    }

    const toggleOption = (key: keyof typeof resetOptions) => {
        setResetOptions(prev => ({ ...prev, [key]: !prev[key] }))
    }

    return (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">

            {/* COLUNA ESQUERDA: CRIAÇÃO DE ITENS (Ocupa 7 colunas) */}
            <div className="xl:col-span-7 bg-surface/40 border border-border p-8 md:p-10 rounded-[3rem] shadow-2xl space-y-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[80px] rounded-full pointer-events-none"></div>
                
                <div>
                    <h2 className="text-2xl font-black text-white flex items-center gap-3">
                        <span className="bg-primary/20 text-primary p-3 rounded-2xl">✨</span> 
                        Novo Item na Vitrine
                    </h2>
                    <p className="text-gray-400 text-sm mt-2 font-medium">Adicione cosméticos épicos para os caçadores gastarem as suas moedas.</p>
                </div>

                <form onSubmit={handleAddItem} className="space-y-6 relative z-10">
                    <div>
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-2 block">Nome do Item</label>
                        <input
                            type="text" required placeholder="Ex: Galáxia Carmesim"
                            className="w-full bg-background/50 border border-white/5 rounded-2xl px-5 py-4 text-white placeholder:text-gray-600 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                            value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-2 block">Preço (Moedas)</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-5 flex items-center text-yellow-500 text-lg">🪙</span>
                                <input
                                    type="number" required placeholder="500"
                                    className="w-full bg-background/50 border border-white/5 rounded-2xl pl-12 pr-5 py-4 text-white placeholder:text-gray-600 focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all font-mono"
                                    value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-2 block">Raridade</label>
                            <select
                                className="w-full bg-background/50 border border-white/5 rounded-2xl px-5 py-4 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all appearance-none"
                                value={formData.rarity} onChange={e => setFormData({ ...formData, rarity: e.target.value })}
                            >
                                <option value="comum">⚪ Comum</option>
                                <option value="raro">🔵 Raro</option>
                                <option value="epico">🟣 Épico</option>
                                <option value="lendario">🟡 Lendário</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-2 block">Categoria</label>
                        <select
                            className="w-full bg-background/50 border border-white/5 rounded-2xl px-5 py-4 text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all appearance-none"
                            value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}
                        >
                            <option value="Fundos Animados">🖼️ Fundo Animado</option>
                            <option value="Molduras de Avatar">⭕ Moldura de Avatar</option>
                            <option value="Títulos Exclusivos">🏷️ Título Exclusivo</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-2 flex items-center justify-between">
                            <span>Estilo CSS (Gradient/Border)</span>
                            <span className="text-[9px] text-primary/70 font-mono normal-case">background: linear-gradient(...)</span>
                        </label>
                        <textarea
                            required placeholder="linear-gradient(to right, #ff0000, #0000ff)"
                            className="w-full bg-background/50 border border-white/5 rounded-2xl px-5 py-4 text-white placeholder:text-gray-600 focus:border-primary focus:ring-1 focus:ring-primary outline-none h-32 font-mono text-sm resize-none custom-scrollbar transition-all"
                            value={formData.style} onChange={e => setFormData({ ...formData, style: e.target.value })}
                        />
                    </div>

                    <button
                        type="submit" disabled={loading}
                        className="w-full py-5 bg-primary hover:bg-blue-500 text-white font-black text-sm uppercase tracking-widest rounded-2xl transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] active:scale-95 disabled:opacity-50 disabled:grayscale mt-4"
                    >
                        {loading ? 'A processar...' : 'Adicionar à Loja'}
                    </button>
                </form>
            </div>

            {/* COLUNA DIREITA: FERRAMENTAS DE GESTÃO (Ocupa 5 colunas) */}
            <div className="xl:col-span-5 space-y-8">
                
                {/* 📢 BROADCAST & EVENTOS */}
                <div className="bg-surface/40 border border-border p-8 rounded-[3rem] shadow-xl">
                    <h2 className="text-xl font-black text-white flex items-center gap-3 mb-6">
                        <span className="bg-blue-500/20 text-blue-400 p-2.5 rounded-xl">📢</span> 
                        Broadcast Global
                    </h2>
                    <form onSubmit={handleBroadcast} className="space-y-4">
                        <textarea
                            placeholder="Mensagem para todos os usuários (deixe vazio para remover)..."
                            className="w-full bg-background/50 border border-white/5 rounded-2xl px-5 py-4 text-white placeholder:text-gray-600 outline-none h-28 italic focus:border-blue-500 transition-all resize-none text-sm"
                            value={announcement.message} onChange={e => setAnnouncement({ ...announcement, message: e.target.value })}
                        />
                        <div className="flex flex-col sm:flex-row gap-3">
                            <select
                                className="flex-1 bg-background/50 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none appearance-none"
                                value={announcement.type} onChange={e => setAnnouncement({ ...announcement, type: e.target.value })}
                            >
                                <option value="info">ℹ️ Informação</option>
                                <option value="event">🔥 Evento Especial</option>
                                <option value="warning">⚠️ Manutenção</option>
                            </select>
                            <button disabled={loading} className="px-8 py-3 bg-white text-black font-black text-sm rounded-xl hover:bg-gray-200 transition-all active:scale-95 disabled:opacity-50 whitespace-nowrap">
                                Publicar
                            </button>
                        </div>
                    </form>
                </div>

                {/* 💰 BANCO CENTRAL */}
                <div className="bg-surface/40 border border-border p-8 rounded-[3rem] shadow-xl relative overflow-hidden group">
                    <div className="absolute -right-10 -bottom-10 text-9xl opacity-5 group-hover:opacity-10 transition-opacity rotate-12 pointer-events-none">🪙</div>
                    <h2 className="text-xl font-black text-white flex items-center gap-3 mb-2 relative z-10">
                        <span className="bg-yellow-500/20 text-yellow-500 p-2.5 rounded-xl">🏦</span> 
                        Banco Central
                    </h2>
                    <p className="text-xs text-gray-400 font-medium leading-relaxed mb-6 relative z-10">
                        Injete moedas diretamente na carteira de todos os jogadores para celebrar marcos.
                    </p>
                    
                    <div className="flex flex-col gap-3 relative z-10">
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-5 flex items-center text-yellow-500 font-bold">🪙</span>
                            <input
                                type="number" placeholder="Quantia de moedas"
                                className="w-full bg-background/80 border border-yellow-500/20 rounded-2xl pl-12 pr-5 py-4 text-white font-mono focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all"
                                value={coinAmount} onChange={e => setCoinAmount(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={handleDistribute} disabled={loading || !coinAmount}
                            className="w-full py-4 bg-linear-to-r from-yellow-600 to-yellow-500 text-black font-black text-sm uppercase tracking-widest rounded-2xl hover:from-yellow-500 hover:to-yellow-400 transition-all shadow-[0_0_15px_rgba(234,179,8,0.2)] active:scale-95 disabled:opacity-50 disabled:grayscale"
                        >
                            Distribuir Fortuna
                        </button>
                    </div>
                </div>

                {/* ❌ NOVO: PROTOCOLO DE LIMPEZA SELETIVO */}
                <div className="bg-red-500/5 border border-red-500/20 p-8 rounded-[3rem] relative overflow-hidden shadow-xl">
                    <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-red-600 to-red-400"></div>
                    
                    <h3 className="text-red-500 font-black text-lg flex items-center gap-3 mb-2">
                        <span className="text-2xl">⚠️</span> Protocolo de Punição
                    </h3>
                    <p className="text-[11px] text-red-400/70 font-medium uppercase tracking-widest mb-6">
                        Apague dados seletivos de um caçador infractor ou corrompido.
                    </p>

                    <div className="space-y-5 relative z-10">
                        <div>
                            <input
                                type="text" placeholder="Username ou ID do alvo..."
                                className="w-full bg-black/40 border border-red-500/30 rounded-xl px-5 py-3.5 text-white placeholder:text-red-900/50 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-all text-sm font-bold"
                                value={targetUser} onChange={e => setTargetUser(e.target.value)}
                            />
                        </div>

                        {/* Checkboxes de Seletividade */}
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={() => toggleOption('games')}
                                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${resetOptions.games ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-black/30 border-white/5 text-gray-500 hover:border-white/20'}`}
                            >
                                🎮 Progresso
                            </button>
                            <button 
                                onClick={() => toggleOption('social')}
                                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${resetOptions.social ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-black/30 border-white/5 text-gray-500 hover:border-white/20'}`}
                            >
                                💬 Social / Feed
                            </button>
                            <button 
                                onClick={() => toggleOption('inventory')}
                                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${resetOptions.inventory ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-black/30 border-white/5 text-gray-500 hover:border-white/20'}`}
                            >
                                🎒 Inventário
                            </button>
                            <button 
                                onClick={() => toggleOption('stats')}
                                className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${resetOptions.stats ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-black/30 border-white/5 text-gray-500 hover:border-white/20'}`}
                            >
                                📊 Stats / Nível
                            </button>
                        </div>

                        <button
                            onClick={handleTargetedReset} disabled={loading || !targetUser}
                            className="w-full py-4 mt-2 bg-red-500/10 border border-red-500/30 text-red-500 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-500 hover:text-white hover:shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
                        >
                            Executar Limpeza
                        </button>
                    </div>
                </div>

            </div>
        </div>
    )
}