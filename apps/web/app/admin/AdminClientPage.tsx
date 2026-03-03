'use client'

import { useState, useTransition } from 'react'
import { addShopItem, distributeCoinsToAll, distributeCoinsToUser, performTargetedReset, setGlobalAnnouncement, updateReportStatus } from './actions'
import { toast } from 'react-toastify'
import { FaStore, FaShieldAlt, FaBullhorn, FaCheck, FaTimes, FaBan, FaUser, FaCoins } from 'react-icons/fa'

export interface ReportData {
    id: string;
    reported_username: string;
    reason: string;
    created_at: string;
    reporter: { username: string } | null;
}

export default function AdminClientPage({ initialReports }: { initialReports: ReportData[] }) {
    // 🔥 useTransition garante que a troca de abas pesadas não trave a UI
    const [isPending, startTransition] = useTransition();
    const [activeTab, setActiveTab] = useState<'operacoes' | 'loja' | 'moderacao'>('operacoes');
    
    const [loading, setLoading] = useState(false)
    const [reports, setReports] = useState<ReportData[]>(initialReports || []);
    
    const [coinAmount, setCoinAmount] = useState('')
    const [announcement, setAnnouncement] = useState({ message: '', type: 'info' })
    const [formData, setFormData] = useState({ name: '', price: '', category: 'Fundos Animados', rarity: 'comum', style: '' })
    
    const [targetUser, setTargetUser] = useState('')
    const [resetOptions, setResetOptions] = useState({ games: false, social: false, inventory: false, stats: false })

    const handleTabChange = (tab: 'operacoes' | 'loja' | 'moderacao') => {
        startTransition(() => {
            setActiveTab(tab);
        });
    };

    async function handleAddItem(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        const res = await addShopItem(formData)
        if (res.success) {
            toast.success(res.success)
            setFormData({ name: '', price: '', category: 'Fundos Animados', rarity: 'comum', style: '' })
        } else toast.error(res.error)
        setLoading(false)
    }

    async function handleDistributeToUser(username: string, amount: number) {
        if (!amount || Number(amount) <= 0) return;
        setLoading(true)
        const res = await distributeCoinsToUser(username, amount)
        if (res.success) toast.success(res.success);
        else toast.error(res.error);
        setCoinAmount('')
        setLoading(false)
    }

    async function handleDistribute() {
        if (!coinAmount || Number(coinAmount) <= 0) return;
        setLoading(true)
        const res = await distributeCoinsToAll(Number(coinAmount))
        if (res.success) toast.success(res.success);
        else toast.error(res.error);
        setCoinAmount('')
        setLoading(false)
    }

    async function handleBroadcast(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        const res = await setGlobalAnnouncement(announcement.message, announcement.type)
        if (res.success) toast.success(res.success)
        else toast.error(res.error)
        setLoading(false)
    }

    async function handleTargetedReset() {
        if (!targetUser) return toast.error("O alvo não pode estar vazio.");
        if (!Object.values(resetOptions).some(v => v === true)) return toast.warning("Selecione pelo menos um módulo para resetar.");

        if (confirm(`Tem certeza que deseja apagar os dados de: ${targetUser}? Esta ação é IRREVERSÍVEL.`)) {
            setLoading(true)
            const res = await performTargetedReset(targetUser, resetOptions);
            if (res.success) {
                toast.success(res.success);
                setTargetUser('');
                setResetOptions({ games: false, social: false, inventory: false, stats: false });
            } else toast.error(res.error);
            setLoading(false)
        }
    }

    async function handleResolveReport(id: string, status: 'resolved' | 'dismissed') {
        setLoading(true);
        const res = await updateReportStatus(id, status);
        if (res.success) {
            toast.success(res.success);
            setReports(prev => prev.filter(r => r.id !== id));
        } else {
            toast.error(res.error);
        }
        setLoading(false);
    }

    function sendToPunishment(username: string) {
        handleTabChange('operacoes'); // Muda para a aba de operações
        setTargetUser(username); // Preenche o alvo
        setTimeout(() => {
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }, 100); // Aguarda o React renderizar a aba antes de rolar
    }

    return (
        <div className="space-y-8">
            {/* MENU DE ABAS */}
            <div className="flex flex-wrap gap-3 bg-surface/40 p-2 rounded-2xl border border-white/5 shadow-inner">
                <button onClick={() => handleTabChange('operacoes')} className={`flex-1 min-w-30 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'operacoes' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
                    <FaBullhorn className="text-lg" /> Operações
                </button>
                <button onClick={() => handleTabChange('loja')} className={`flex-1 min-w-30 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'loja' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
                    <FaStore className="text-lg" /> Vitrine
                </button>
                <button onClick={() => handleTabChange('moderacao')} className={`flex-1 min-w-30 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all relative ${activeTab === 'moderacao' ? 'bg-red-600 text-white shadow-md' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}>
                    <FaShieldAlt className="text-lg" /> Moderação
                    {reports.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] w-5 h-5 flex items-center justify-center rounded-full animate-bounce">{reports.length}</span>}
                </button>
            </div>

            {/* INDICADOR DE CARREGAMENTO DAS ABAS */}
            {isPending && <div className="text-center py-4 text-primary text-sm font-bold animate-pulse">Carregando painel...</div>}

            {/* ABA 1: OPERAÇÕES GERAIS */}
            {!isPending && activeTab === 'operacoes' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4">
                    {/* 📢 BROADCAST & EVENTOS */}
                    <div className="bg-surface/40 border border-border p-8 rounded-[3rem] shadow-xl">
                        <h2 className="text-xl font-black text-white flex items-center gap-3 mb-6"><span className="bg-blue-500/20 text-blue-400 p-2.5 rounded-xl">📢</span> Broadcast Global</h2>
                        <form onSubmit={handleBroadcast} className="space-y-4">
                            <textarea placeholder="Mensagem para todos os usuários..." className="w-full bg-background/50 border border-white/5 rounded-2xl px-5 py-4 text-white placeholder:text-gray-600 outline-none h-32 italic focus:border-blue-500 transition-all resize-none text-sm" value={announcement.message} onChange={e => setAnnouncement({ ...announcement, message: e.target.value })} />
                            <div className="flex flex-col sm:flex-row gap-3">
                                <select className="flex-1 bg-background/50 border border-white/5 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none appearance-none" value={announcement.type} onChange={e => setAnnouncement({ ...announcement, type: e.target.value })}>
                                    <option value="info">ℹ️ Informação</option>
                                    <option value="event">🔥 Evento Especial</option>
                                    <option value="warning">⚠️ Manutenção</option>
                                </select>
                                <button disabled={loading} className="px-8 py-3 bg-white text-black font-black text-sm rounded-xl hover:bg-gray-200 transition-all active:scale-95 disabled:opacity-50">Publicar</button>
                            </div>
                        </form>
                    </div>

                    {/* 💰 BANCO CENTRAL */}
                    <div className="bg-surface/40 border border-border p-8 rounded-[3rem] shadow-xl relative overflow-hidden group">
                        <div className="absolute -right-10 -bottom-10 text-9xl opacity-5 group-hover:opacity-10 transition-opacity rotate-12 pointer-events-none"><FaCoins /></div>
                        <h2 className="text-xl font-black text-white flex items-center gap-3 mb-2 relative z-10"><span className="bg-yellow-500/20 text-yellow-500 p-2.5 rounded-xl">🏦</span> Banco Central</h2>
                        <p className="text-gray-400 text-sm mb-6 relative z-10">Distribua moedas para um usuário específico ou para toda a comunidade.</p>
                        <div className="flex flex-col gap-3 relative z-10">
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-5 flex items-center text-yellow-500 font-bold"><FaUser /></span>
                                <input type="text" placeholder="Username (deixe vazio para todos)" className="w-full bg-background/80 border border-yellow-500/20 rounded-2xl pl-12 pr-5 py-4 text-white font-mono focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all" value={targetUser} onChange={e => setTargetUser(e.target.value)} />
                            </div>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-5 flex items-center text-yellow-500 font-bold"><FaCoins /></span>
                                <input type="number" placeholder="Quantia de moedas" className="w-full bg-background/80 border border-yellow-500/20 rounded-2xl pl-12 pr-5 py-4 text-white font-mono focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all" value={coinAmount} onChange={e => setCoinAmount(e.target.value)} />
                            </div>
                            {targetUser ? (
                                <button onClick={() => handleDistributeToUser(targetUser, Number(coinAmount))} disabled={loading || !coinAmount} className="w-full py-4 bg-linear-to-r from-yellow-600 to-yellow-500 text-black font-black text-sm uppercase tracking-widest rounded-2xl hover:from-yellow-500 hover:to-yellow-400 transition-all shadow-[0_0_15px_rgba(234,179,8,0.2)] active:scale-95 disabled:opacity-50">Enviar para {targetUser}</button>
                            ) : (
                                <button onClick={handleDistribute} disabled={loading || !coinAmount} className="w-full py-4 bg-linear-to-r from-yellow-600 to-yellow-500 text-black font-black text-sm uppercase tracking-widest rounded-2xl hover:from-yellow-500 hover:to-yellow-400 transition-all shadow-[0_0_15px_rgba(234,179,8,0.2)] active:scale-95 disabled:opacity-50">Enviar para Todos</button>
                            )}
                        </div>
                    </div>

                    {/* PROTOCOLO DE PUNIÇÃO / LIMPEZA (Movi para a aba Operações onde o targetUser é configurado pelo botão Punir) */}
                    <div className="lg:col-span-2 bg-red-500/5 border border-red-500/20 p-8 rounded-[3rem] relative overflow-hidden shadow-xl">
                        <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-red-600 to-red-400"></div>
                        <h3 className="text-red-500 font-black text-lg flex items-center gap-3 mb-2"><span className="text-2xl">⚠️</span> Protocolo de Punição</h3>
                        <p className="text-[11px] text-red-400/70 font-medium uppercase tracking-widest mb-6">Apague dados seletivos de um caçador infractor ou corrompido.</p>

                        <div className="space-y-5 relative z-10 max-w-2xl">
                            <input type="text" placeholder="Username, Email ou ID do alvo..." className="w-full bg-black/40 border border-red-500/30 rounded-xl px-5 py-3.5 text-white placeholder:text-red-900/50 focus:border-red-500 outline-none transition-all text-sm font-bold" value={targetUser} onChange={e => setTargetUser(e.target.value)} />

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {['games', 'social', 'inventory', 'stats'].map(key => (
                                    <button
                                        key={key} onClick={() => setResetOptions(prev => ({ ...prev, [key]: !prev[key as keyof typeof resetOptions] }))}
                                        className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${resetOptions[key as keyof typeof resetOptions] ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-black/30 border-white/5 text-gray-500 hover:border-white/20'}`}
                                    >
                                        {key === 'games' ? '🎮 Progresso' : key === 'social' ? '💬 Social' : key === 'inventory' ? '🎒 Inventário' : '📊 Stats'}
                                    </button>
                                ))}
                            </div>

                            <button onClick={handleTargetedReset} disabled={loading || !targetUser} className="w-full py-4 mt-2 bg-red-500/10 border border-red-500/30 text-red-500 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all active:scale-95 disabled:opacity-50">
                                Executar Limpeza Irreversível
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ABA 2: LOJA */}
            {!isPending && activeTab === 'loja' && (
                <div className="bg-surface/40 border border-border p-8 md:p-10 rounded-[3rem] shadow-2xl relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 max-w-4xl mx-auto">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 blur-[80px] rounded-full pointer-events-none"></div>
                    <h2 className="text-2xl font-black text-white flex items-center gap-3 mb-8"><span className="bg-primary/20 text-primary p-3 rounded-2xl">✨</span> Novo Item na Vitrine</h2>
                    <form onSubmit={handleAddItem} className="space-y-6 relative z-10">
                        <div>
                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-2 block">Nome do Item</label>
                            <input type="text" required placeholder="Ex: Galáxia Carmesim" className="w-full bg-background/50 border border-white/5 rounded-2xl px-5 py-4 text-white focus:border-primary outline-none transition-all" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-2 block">Preço (Moedas)</label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 pl-5 flex items-center text-yellow-500"><FaCoins /></span>
                                    <input type="number" required placeholder="500" className="w-full bg-background/50 border border-white/5 rounded-2xl pl-12 pr-5 py-4 text-white focus:border-yellow-500 outline-none transition-all font-mono" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-2 block">Raridade</label>
                                <select className="w-full bg-background/50 border border-white/5 rounded-2xl px-5 py-4 text-white focus:border-primary outline-none transition-all appearance-none" value={formData.rarity} onChange={e => setFormData({ ...formData, rarity: e.target.value })}>
                                    <option value="comum">⚪ Comum</option><option value="raro">🔵 Raro</option><option value="epico">🟣 Épico</option><option value="lendario">🟡 Lendário</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-2 block">Categoria</label>
                            <select className="w-full bg-background/50 border border-white/5 rounded-2xl px-5 py-4 text-white focus:border-primary outline-none transition-all appearance-none" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                <option value="Fundos Animados">🖼️ Fundo Animado</option><option value="Molduras de Avatar">⭕ Moldura de Avatar</option><option value="Títulos Exclusivos">🏷️ Título Exclusivo</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-widest ml-2 mb-2 flex items-center justify-between"><span>Estilo CSS (Gradient/Border)</span><span className="text-[9px] text-primary/70 font-mono normal-case">background: linear-gradient(...)</span></label>
                            <textarea required placeholder="linear-gradient(to right, #ff0000, #0000ff)" className="w-full bg-background/50 border border-white/5 rounded-2xl px-5 py-4 text-white focus:border-primary outline-none h-32 font-mono text-sm resize-none custom-scrollbar transition-all" value={formData.style} onChange={e => setFormData({ ...formData, style: e.target.value })} />
                        </div>
                        <button type="submit" disabled={loading} className="w-full py-5 bg-primary hover:bg-blue-500 text-white font-black text-sm uppercase tracking-widest rounded-2xl transition-all active:scale-95 disabled:opacity-50 mt-4">Adicionar à Loja</button>
                    </form>
                </div>
            )}

            {/* ABA 3: MODERAÇÃO */}
            {!isPending && activeTab === 'moderacao' && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                    {/* LISTA DE DENÚNCIAS */}
                    <div className="bg-surface/40 border border-border p-8 rounded-[3rem] shadow-xl">
                        <h2 className="text-xl font-black text-white flex items-center gap-3 mb-6"><span className="bg-orange-500/20 text-orange-400 p-2.5 rounded-xl">🚨</span> Denúncias Pendentes</h2>

                        {reports.length === 0 ? (
                            <div className="text-center py-10 opacity-50 bg-background/30 rounded-3xl border border-dashed border-white/10">
                                <FaShieldAlt className="mx-auto text-4xl mb-3" />
                                <p className="text-sm font-bold uppercase tracking-widest text-gray-500">Tudo pacífico por aqui</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {reports.map(report => (
                                    <div key={report.id} className="bg-background/80 border border-white/5 p-5 rounded-2xl flex flex-col md:flex-row justify-between gap-4">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="bg-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded">Alvo: {report.reported_username}</span>
                                                <span className="text-[10px] text-gray-500 uppercase tracking-widest">Reportado por: {report.reporter?.username}</span>
                                            </div>
                                            <p className="text-gray-300 text-sm font-medium">&quot;{report.reason}&quot;</p>
                                            <p className="text-[10px] text-gray-600 mt-2">{new Date(report.created_at).toLocaleString('pt-BR')}</p>
                                        </div>
                                        <div className="flex flex-row md:flex-col gap-2 shrink-0">
                                            <button onClick={() => sendToPunishment(report.reported_username)} className="flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg text-xs font-bold transition-colors">
                                                <FaBan /> Punir
                                            </button>
                                            <button onClick={() => handleResolveReport(report.id, 'resolved')} className="flex items-center justify-center gap-2 px-4 py-2 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white rounded-lg text-xs font-bold transition-colors">
                                                <FaCheck /> Resolvido
                                            </button>
                                            <button onClick={() => handleResolveReport(report.id, 'dismissed')} className="flex items-center justify-center gap-2 px-4 py-2 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white rounded-lg text-xs font-bold transition-colors">
                                                <FaTimes /> Descartar
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}