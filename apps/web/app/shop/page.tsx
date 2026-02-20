import React from "react";

// 1. Criamos a regra (Tipagem) para o TypeScript entender os itens
type ShopItem = {
    id: number;
    name: string;
    price: number;
    type: string;
    isOwned: boolean;
    gradient?: string; // O '?' indica que é opcional
    border?: string;   // O '?' indica que é opcional
    tag?: string;      // O '?' indica que é opcional
};

type ShopCategory = {
    title: string;
    description: string;
    items: ShopItem[];
};

export default function ShopPage() {
    const userBalance = 8450;

    // 2. Avisamos que esta constante segue a regra ShopCategory
    const shopCategories: ShopCategory[] = [
        {
            title: "🌌 Fundos Animados",
            description: "Personalize o banner do seu perfil público.",
            items: [
                { id: 1, name: "Nebulosa Escura", price: 2000, type: "Legendary", gradient: "from-purple-900 via-black to-blue-900", isOwned: false },
                { id: 2, name: "Fogo Infernal", price: 1500, type: "Epic", gradient: "from-red-900 via-orange-900 to-black", isOwned: false },
                { id: 3, name: "Matriz de Dados", price: 800, type: "Rare", gradient: "from-green-900 to-black", isOwned: true },
            ]
        },
        {
            title: "🖼️ Molduras de Avatar",
            description: "Destaque a sua foto nos feeds e leaderboards.",
            items: [
                { id: 4, name: "Coroa de Platina", price: 3000, type: "Legendary", border: "border-blue-300 shadow-[0_0_15px_rgba(147,197,253,0.5)]", isOwned: false },
                { id: 5, name: "Aura Tóxica", price: 1200, type: "Epic", border: "border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]", isOwned: false },
                { id: 6, name: "Neon Simples", price: 500, type: "Rare", border: "border-primary", isOwned: false },
            ]
        },
        {
            title: "🏷️ Títulos Exclusivos",
            description: "Exiba a sua especialidade logo abaixo do seu nome.",
            items: [
                { id: 7, name: "Caçador de Troféus", price: 1000, type: "Epic", tag: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50", isOwned: false },
                { id: 8, name: "Sobrevivente (No Hit)", price: 2500, type: "Legendary", tag: "bg-red-500/20 text-red-400 border-red-500/50", isOwned: false },
                { id: 9, name: "Completista", price: 500, type: "Rare", tag: "bg-blue-500/20 text-blue-400 border-blue-500/50", isOwned: true },
            ]
        }
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
                {shopCategories.map((category, catIndex) => (
                    <div key={catIndex} className="space-y-4">

                        {/* Título da Categoria */}
                        <div>
                            <h3 className="text-2xl font-bold text-white">{category.title}</h3>
                            <p className="text-gray-400 text-sm mt-1">{category.description}</p>
                        </div>

                        {/* Grid de Itens */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {category.items.map((item) => (
                                <div
                                    key={item.id}
                                    className="bg-surface border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-all group flex flex-col"
                                >
                                    {/* Pré-visualização do Item */}
                                    <div className="h-32 bg-background flex items-center justify-center p-4 relative overflow-hidden">
                                        {/* Badge de Raridade */}
                                        <div className={`absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${item.type === 'Legendary' ? 'bg-orange-500/20 text-orange-400 border-orange-500/50' :
                                                item.type === 'Epic' ? 'bg-purple-500/20 text-purple-400 border-purple-500/50' :
                                                    'bg-blue-500/20 text-blue-400 border-blue-500/50'
                                            }`}>
                                            {item.type}
                                        </div>

                                        {/* Renderização Condicional da Pré-visualização com base na categoria */}
                                        {item.gradient && (
                                            <div className={`w-full h-full rounded-md bg-linear-to-r ${item.gradient} shadow-inner`}></div>
                                        )}
                                        {item.border && (
                                            <div className={`w-16 h-16 rounded-full border-4 ${item.border} bg-surface flex items-center justify-center`}>
                                                <span className="text-2xl">👤</span>
                                            </div>
                                        )}
                                        {item.tag && (
                                            <div className={`px-4 py-1.5 rounded-md border text-sm font-bold ${item.tag}`}>
                                                {item.name}
                                            </div>
                                        )}
                                    </div>

                                    {/* Informações e Botão de Compra */}
                                    <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                                        <div>
                                            <h4 className="text-lg font-bold text-white group-hover:text-primary transition-colors">{item.name}</h4>
                                        </div>

                                        {item.isOwned ? (
                                            <button disabled className="w-full py-2.5 bg-green-500/10 text-green-400 border border-green-500/20 rounded-lg font-bold text-sm cursor-default">
                                                ✓ Adquirido
                                            </button>
                                        ) : (
                                            <button className="w-full py-2.5 bg-primary hover:bg-primary/80 text-white rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary/20">
                                                <span>🪙 {item.price.toLocaleString()}</span>
                                                <span>Comprar</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                    </div>
                ))}
            </div>

        </div>
    );
}