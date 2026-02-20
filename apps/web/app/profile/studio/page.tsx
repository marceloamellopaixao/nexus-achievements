import React from "react";
import { createClient } from "@/utils/supabase/server";
import EquipButton from "./EquipButton";
import Link from "next/link";

// 1. Criamos a tipagem exata que vem do banco de dados
type ShopItem = {
    id: string;
    name: string;
    category: string;
    rarity_type: string;
    gradient: string | null;
    border_style: string | null;
    tag_style: string | null;
};

export default async function StudioPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return <div className="p-10 text-white">Carregando...</div>;

    const { data: userData } = await supabase
        .from("users")
        .select("equipped_background, equipped_border, equipped_title")
        .eq("id", user.id)
        .single();

    const equipped = {
        background: userData?.equipped_background,
        border: userData?.equipped_border,
        title: userData?.equipped_title,
    };

    const { data: inventoryData } = await supabase
        .from("user_inventory")
        .select(`
            item_id,
            shop_items (
                id, name, category, rarity_type, gradient, border_style, tag_style
            )
        `)
        .eq("user_id", user.id);

    // 2. Avisamos o TypeScript que o resultado é um array de ShopItem e não usamos 'any'
    const myItems = (inventoryData?.map((inv) => inv.shop_items) as unknown as ShopItem[]) || [];
    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10 max-w-5xl mx-auto">

            <div className="flex items-center justify-between border-b border-border pb-6">
                <div>
                    <h2 className="text-3xl font-bold text-white tracking-tight">🎨 Estúdio de Customização</h2>
                    <p className="text-gray-400 mt-1">Faça a gestão dos seus cosméticos e da sua Estante de Troféus.</p>
                </div>
                <Link href="/profile" className="px-4 py-2 bg-surface border border-border rounded-lg text-sm text-white hover:border-primary transition-colors">
                    Ver o meu Perfil 👀
                </Link>
            </div>

            {/* SEÇÃO 1: COSMÉTICOS (Inventário) */}
            <div className="space-y-6">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    🎒 O Meu Inventário
                </h3>

                {myItems.length === 0 ? (
                    <div className="bg-surface/50 border border-border border-dashed rounded-xl p-10 text-center">
                        <span className="text-4xl">🛒</span>
                        <p className="text-gray-400 font-medium mt-4">O seu inventário está vazio.</p>
                        <Link href="/shop" className="text-primary hover:text-primary/80 text-sm mt-2 inline-block font-bold">
                            Visitar a Loja de Pontos →
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {myItems.map((item) => {
                            // Verifica se este item específico está equipado
                            const isEquipped =
                                item.id === equipped.background ||
                                item.id === equipped.border ||
                                item.id === equipped.title;

                            return (
                                <div key={item.id} className={`bg-surface border rounded-xl p-4 flex flex-col gap-4 transition-all ${isEquipped ? 'border-primary shadow-[0_0_15px_rgba(147,197,253,0.1)]' : 'border-border'}`}>

                                    {/* Pré-visualização do Item */}
                                    <div className="h-24 bg-background rounded-lg flex items-center justify-center relative overflow-hidden">
                                        {item.gradient && <div className={`w-full h-full bg-linear-to-r ${item.gradient}`}></div>}
                                        {item.border_style && <div className={`w-12 h-12 rounded-full border-4 ${item.border_style} bg-surface`}></div>}
                                        {item.tag_style && <div className={`px-3 py-1 rounded-md border text-xs font-bold ${item.tag_style}`}>{item.name}</div>}

                                        {isEquipped && (
                                            <div className="absolute top-1 right-1 bg-primary text-white text-[9px] font-black uppercase px-1.5 py-0.5 rounded">
                                                Em Uso
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 text-center">
                                        <p className="text-xs text-gray-500 font-bold uppercase mb-1">{item.category}</p>
                                        <p className="text-sm font-bold text-white truncate">{item.name}</p>
                                    </div>

                                    <EquipButton
                                        itemId={item.id}
                                        category={item.category}
                                        isEquipped={isEquipped}
                                    />
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* SEÇÃO 2: ESTANTE DE TROFÉUS (Espaço reservado para o Drag & Drop futuro) */}
            <div className="space-y-6 pt-8 border-t border-border">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    🏆 Estante de Troféus
                </h3>
                <p className="text-sm text-gray-400 -mt-4">Selecione até 5 jogos para exibir no seu perfil público.</p>

                <div className="bg-surface/30 border border-border border-dashed rounded-2xl h-48 flex items-center justify-center flex-col text-center">
                    <span className="text-3xl opacity-50 mb-2">🎮</span>
                    <p className="text-gray-500 font-medium">
                        A seleção de jogos estará disponível assim que sincronizarmos as suas platinas reais.
                    </p>
                </div>
            </div>

        </div>
    );
}