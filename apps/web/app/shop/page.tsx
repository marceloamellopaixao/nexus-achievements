import React from "react";
import { createClient } from "@/utils/supabase/server";
import BuyButton from "./BuyButton";

type ShopItem = { id: string; name: string; category: string; price: number; rarity_type: string; gradient?: string; border_style?: string; tag_style?: string; };
type ShopCategory = { title: string; description: string; filter: string; icon: string; };

export default async function ShopPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const { data: dbItems } = await supabase.from("shop_items").select("*").order("price", { ascending: true });

    let userInventory: string[] = [];
    let userBalance = 0;

    if (user) {
        const { data: userData } = await supabase.from("users").select("nexus_coins").eq("id", user.id).single();
        if (userData) userBalance = userData.nexus_coins;

        const { data: invData } = await supabase.from("user_inventory").select("item_id").eq("user_id", user.id);
        if (invData) userInventory = invData.map(i => i.item_id);
    }

    const categories: ShopCategory[] = [
        { title: "Fundos de Perfil", icon: "🌌", description: "Personalize o banner do seu perfil público.", filter: "Fundos Animados" },
        { title: "Molduras de Avatar", icon: "🖼️", description: "Destaque a sua foto nos feeds e leaderboards.", filter: "Molduras de Avatar" },
        { title: "Títulos Exclusivos", icon: "🏷️", description: "Exiba a sua especialidade logo abaixo do seu nome.", filter: "Títulos" },
        // NOVA CATEGORIA ADICIONADA:
        { title: "Melhorias de Conta", icon: "⬆️", description: "Aumente o limite da sua Estante de Troféus no perfil.", filter: "Expansões" }
    ];

    return (
        <div className="space-y-12 animate-in fade-in duration-700 pb-20 max-w-6xl mx-auto px-4 md:px-0">
            {/* HEADER GLASSMORPHISM */}
            <div className="relative bg-surface/40 backdrop-blur-xl border border-border/50 p-8 md:p-12 rounded-[2.5rem] overflow-hidden shadow-2xl mt-4">
                <div className="absolute top-0 right-0 w-125 h-125 bg-primary/10 blur-[120px] rounded-full pointer-events-none translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 blur-[100px] rounded-full pointer-events-none"></div>

                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
                    <div className="max-w-xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-primary text-[10px] font-black uppercase tracking-widest mb-4">
                            💎 Mercado Oficial Nexus
                        </div>
                        <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter leading-tight">
                            Loja de <span className="text-transparent bg-clip-text bg-linear-to-r from-primary to-blue-400">Cosméticos</span>
                        </h2>
                        <p className="text-gray-400 mt-4 text-base md:text-lg font-medium leading-relaxed">
                            Aprimore a sua identidade visual. Use as suas moedas para desbloquear estilos que refletem a sua mestria nos jogos.
                        </p>
                    </div>

                    <div className="bg-background/80 backdrop-blur-md border border-white/10 p-6 md:p-8 rounded-3xl flex items-center gap-6 shadow-[0_20px_50px_rgba(0,0,0,0.4)] border-t-white/20 min-w-70">
                        <div className="w-16 h-16 bg-yellow-500/10 rounded-2xl flex items-center justify-center text-5xl shadow-inner border border-yellow-500/20">
                            <span className="drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]">🪙</span>
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] mb-1">O Seu Saldo</p>
                            <p className="text-4xl font-black text-white tracking-tighter tabular-nums">
                                {userBalance.toLocaleString()}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* CONTEÚDO DA LOJA */}
            <div className="space-y-16">
                {categories.map((category, catIndex) => {
                    const itemsInCategory = (dbItems as ShopItem[] || []).filter(item => item.category === category.filter);
                    if (itemsInCategory.length === 0) return null;

                    return (
                        <div key={catIndex} className="space-y-8 animate-in slide-in-from-bottom-5 duration-500 delay-100">
                            <div className="flex items-center gap-4 border-b border-border/50 pb-4">
                                <span className="text-4xl">{category.icon}</span>
                                <div>
                                    <h3 className="text-2xl md:text-3xl font-black text-white tracking-tight">{category.title}</h3>
                                    <p className="text-gray-500 text-sm font-medium">{category.description}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                                {itemsInCategory.map((item) => {
                                    const isOwned = userInventory.includes(item.id);
                                    const isLegendary = item.rarity_type === 'Legendary';
                                    const isEpic = item.rarity_type === 'Epic';
                                    const isMythic = item.rarity_type === 'Mythic';

                                    // Lógica visual para destacar Mythic
                                    let cardBorderClass = 'border-border/50 hover:border-primary/50';
                                    let glowClass = '';
                                    let badgeClass = 'bg-blue-500/20 text-blue-400 border-blue-500/40';

                                    if (isMythic) {
                                        cardBorderClass = 'border-red-500/30 hover:border-red-500/60';
                                        glowClass = 'bg-red-500/5 animate-pulse';
                                        badgeClass = 'bg-red-500/20 text-red-400 border-red-500/40 shadow-[0_0_10px_rgba(239,68,68,0.5)]';
                                    } else if (isLegendary) {
                                        cardBorderClass = 'border-orange-500/30 hover:border-orange-500/60';
                                        glowClass = 'bg-orange-500/5 animate-pulse';
                                        badgeClass = 'bg-orange-500/20 text-orange-400 border-orange-500/40';
                                    } else if (isEpic) {
                                        cardBorderClass = 'border-purple-500/30 hover:border-purple-500/60';
                                        glowClass = 'bg-purple-500/5 animate-pulse';
                                        badgeClass = 'bg-purple-500/20 text-purple-400 border-purple-500/40';
                                    }

                                    return (
                                        <div key={item.id} className={`group bg-surface/50 backdrop-blur-sm border rounded-4xl overflow-hidden transition-all duration-500 hover:-translate-y-2 flex flex-col shadow-lg hover:shadow-2xl ${cardBorderClass}`}>

                                            <div className="h-44 bg-background relative flex items-center justify-center p-6 overflow-hidden border-b border-white/5">
                                                {glowClass && <div className={`absolute inset-0 ${glowClass}`}></div>}

                                                <div className={`absolute top-4 left-4 text-[9px] font-black uppercase tracking-[0.15em] px-3 py-1 rounded-full border z-20 shadow-sm ${badgeClass}`}>
                                                    {item.rarity_type}
                                                </div>

                                                <div className="relative z-10 w-full h-full flex items-center justify-center">
                                                    {item.category === "Fundos Animados" && (
                                                        <div className="w-full h-full rounded-2xl border border-white/10 shadow-2xl transition-transform duration-700 group-hover:scale-110" style={{ background: item.gradient || '#18181b' }}></div>
                                                    )}

                                                    {item.category === "Molduras de Avatar" && (
                                                        <div className="relative w-24 h-24 flex items-center justify-center group-hover:rotate-12 transition-transform duration-500">
                                                            <div className="absolute inset-0 rounded-full p-1" style={{ background: item.border_style || 'transparent' }}>
                                                                <div className="w-full h-full rounded-full bg-surface flex items-center justify-center">
                                                                    <span className="text-3xl grayscale group-hover:grayscale-0 transition-all">👤</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {item.category === "Títulos" && (
                                                        <div className="px-6 py-2.5 rounded-xl border border-white/20 text-sm font-black shadow-2xl transition-all duration-500 group-hover:tracking-widest" style={{ background: item.tag_style || '#27272a' }}>
                                                            {item.name}
                                                        </div>
                                                    )}

                                                    {item.category === "Expansões" && (
                                                        <div className="text-6xl group-hover:scale-110 transition-transform drop-shadow-2xl">
                                                            {item.id.includes('5') ? '🏆🏆🏆' : item.id.includes('3') ? '🏆🏆' : '🏆'}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="p-6 flex-1 flex flex-col justify-between gap-6">
                                                <h4 className="text-xl font-black text-white group-hover:text-primary transition-colors leading-tight">{item.name}</h4>
                                                <div className="pt-2">
                                                    {isOwned ? (
                                                        <div className="w-full py-3 bg-green-500/10 text-green-400 border border-green-500/20 rounded-xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-default">
                                                            <span className="text-lg">✓</span> Adquirido
                                                        </div>
                                                    ) : (
                                                        <BuyButton itemId={item.id} price={item.price} />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}