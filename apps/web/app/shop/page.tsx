import React from "react";
import { createClient } from "@/utils/supabase/server";
import BuyButton from "./BuyButton";

// Tipagem rigorosa para evitar erros de compilação
type ShopItem = {
    id: string;
    name: string;
    category: string;
    price: number;
    rarity_type: string;
    gradient?: string;
    border_style?: string;
    tag_style?: string;
};

type ShopCategory = {
    title: string;
    description: string;
    filter: string; // Adicionado para filtrar no banco
};

export default async function ShopPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 1. Busca os dados reais do banco
    const { data: dbItems } = await supabase
        .from("shop_items")
        .select("*")
        .order("price", { ascending: true });

    let userInventory: string[] = [];
    let userBalance = 0;

    if (user) {
        const { data: userData } = await supabase.from("users").select("nexus_coins").eq("id", user.id).single();
        if (userData) userBalance = userData.nexus_coins;

        const { data: invData } = await supabase.from("user_inventory").select("item_id").eq("user_id", user.id);
        if (invData) userInventory = invData.map(i => i.item_id);
    }

    // 2. Definição das categorias (idêntica à sua estrutura mockada)
    const categories: ShopCategory[] = [
        { title: "🌌 Fundos Animados", description: "Personalize o banner do seu perfil público.", filter: "Fundos Animados" },
        { title: "🖼️ Molduras de Avatar", description: "Destaque a sua foto nos feeds e leaderboards.", filter: "Molduras de Avatar" },
        { title: "🏷️ Títulos Exclusivos", description: "Exiba a sua especialidade logo abaixo do seu nome.", filter: "Títulos Exclusivos" }
    ];

    return (
        <div className="space-y-10 animate-in fade-in duration-500 pb-10 max-w-6xl mx-auto">

            {/* Cabeçalho da Loja e Saldo */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-surface/50 border border-border p-8 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] rounded-full pointer-events-none"></div>

                <div className="relative z-10">
                    <h2 className="text-4xl font-black text-white tracking-tight">🛒 Loja do Nexus</h2>
                    <p className="text-gray-400 mt-2 text-lg">
                        Gaste as suas Nexus Coins duramente conquistadas em cosméticos exclusivos.
                    </p>
                </div>

                <div className="relative z-10 bg-background border border-border px-6 py-4 rounded-xl flex items-center gap-4 shadow-lg">
                    <div className="text-4xl text-yellow-500 drop-shadow-[0_0_10px_rgba(234,179,8,0.3)]">🪙</div>
                    <div>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">O Seu Saldo</p>
                        <p className="text-3xl font-black text-white">{userBalance.toLocaleString()}</p>
                    </div>
                </div>
            </div>

            {/* Categorias da Loja */}
            <div className="space-y-12">
                {categories.map((category, catIndex) => {
                    const itemsInCategory = (dbItems as ShopItem[] || []).filter(item => item.category === category.filter);
                    if (itemsInCategory.length === 0) return null;

                    return (
                        <div key={catIndex} className="space-y-4">
                            <div>
                                <h3 className="text-2xl font-bold text-white">{category.title}</h3>
                                <p className="text-gray-400 text-sm mt-1">{category.description}</p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {itemsInCategory.map((item) => {
                                    const isOwned = userInventory.includes(item.id);
                                    
                                    const bannerClass = item.gradient ? `bg-linear-to-r ${item.gradient}` : "bg-linear-to-r from-primary/40 via-purple-900/40 to-background";

                                    return (
                                        <div key={item.id} className="bg-surface border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-all group flex flex-col">
                                            <div className="h-32 bg-background flex items-center justify-center p-4 relative overflow-hidden">
                                                <div className={`absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border z-20 ${
                                                    item.rarity_type === 'Legendary' ? 'bg-orange-500/20 text-orange-400 border-orange-500/50' :
                                                    item.rarity_type === 'Epic' ? 'bg-purple-500/20 text-purple-400 border-purple-500/50' :
                                                    'bg-blue-500/20 text-blue-400 border-blue-500/50'
                                                }`}>
                                                    {item.rarity_type}
                                                </div>

                                                {/* FUNDO (STYLE INLINE) */}
                                                {item.gradient && (
                                                    <div 
                                                        className={`absolute inset-0 w-full h-full opacity-80 ${bannerClass}`}
                                                    ></div>
                                                )}

                                                {/* MOLDURA */}
                                                {item.border_style && (
                                                    <div 
                                                        className="w-16 h-16 rounded-full border-4 bg-surface flex items-center justify-center z-10"
                                                        style={{ borderImage: item.border_style, borderImageSlice: 1 }}
                                                    >
                                                        <span className="text-2xl">👤</span>
                                                    </div>
                                                )}

                                                {/* TAG */}
                                                {item.tag_style && (
                                                    <div 
                                                        className="px-4 py-1.5 rounded-md border text-sm font-bold z-10"
                                                        style={{ background: item.tag_style }}
                                                    >
                                                        {item.name}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                                                <h4 className="text-lg font-bold text-white group-hover:text-primary transition-colors">{item.name}</h4>
                                                
                                                {isOwned ? (
                                                    <button disabled className="w-full py-2.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg font-bold text-sm cursor-default">
                                                        ✓ Adquirido
                                                    </button>
                                                ) : (
                                                    <BuyButton itemId={item.id} price={item.price} />
                                                )}
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