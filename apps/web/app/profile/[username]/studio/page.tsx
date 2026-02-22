import React from "react";
import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import EquipButton from "./EquipButton";
import ProfileForm from "./ProfileForm";
import ShowcaseEditor from "./ShowcaseEditor";

type ShopItem = {
  id: string;
  name: string;
  category: string;
  rarity_type: string;
  gradient?: string | null;
  border_style?: string | null;
  tag_style?: string | null;
};

interface InventoryResult {
  item_id: string;
  shop_items: ShopItem | null;
}

interface StudioPageProps {
  params: Promise<{ username: string }>;
}

export default async function StudioPage({ params }: StudioPageProps) {
  const { username } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return (
    <div className="flex flex-col items-center justify-center min-h-88 space-y-4">
      <span className="text-6xl mb-2 drop-shadow-md">🔒</span>
      <h2 className="text-2xl font-black text-white">Acesso Restrito</h2>
      <p className="text-gray-400 font-bold text-center">Inicie sessão no Nexus para aceder ao seu Estúdio.</p>
    </div>
  );

  const { data: userData } = await supabase
    .from("users")
    .select("username, bio, equipped_background, equipped_border, equipped_title, showcase_games, showcase_limit")
    .eq("id", user.id)
    .single();

  if (userData?.username !== username) return notFound();

  // 1. BUSCA OS JOGOS DO UTILIZADOR PARA O EDITOR
  const { data: myGamesRaw } = await supabase
    .from("user_games")
    .select("games (id, title, cover_url)")
    .eq("user_id", user.id);

  const myGames = (myGamesRaw?.map(g => g.games).filter(Boolean) as unknown as { id: string, title: string, cover_url: string }[]) || [];

  // 2. BUSCA E FILTRA O INVENTÁRIO
  const { data: inventoryData } = await supabase
    .from("user_inventory")
    .select(`item_id, shop_items (id, name, category, rarity_type, gradient, border_style, tag_style)`)
    .eq("user_id", user.id);

  const allOwnedItems = (inventoryData as unknown as InventoryResult[] | null)
    ?.map(inv => inv.shop_items)
    .filter((item): item is ShopItem => item !== null) || [];

  const cosmeticItems = allOwnedItems.filter(item => item.category !== "Expansões");
  const expansionItems = allOwnedItems.filter(item => item.category === "Expansões");

  const equipped = {
    background: userData?.equipped_background,
    border: userData?.equipped_border,
    title: userData?.equipped_title,
  };

  // 3. TRATAMENTO DE SEGURANÇA PARA A ESTANTE (Showcase)
  // Garante que enviamos um array limpo, evitando o erro "selected.includes is not a function"
  const initialShowcase = Array.isArray(userData?.showcase_games) 
    ? userData.showcase_games 
    : [];

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pb-20 max-w-5xl mx-auto px-4 md:px-0">

      {/* HEADER REFINADO */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-8 border-b border-white/5 pb-8">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-linear-to-br from-primary/20 to-purple-500/10 rounded-2xl flex items-center justify-center text-3xl border border-primary/20 shadow-lg shrink-0">
            🎨
          </div>
          <div>
            <h1 className="text-4xl font-black text-white tracking-tighter italic">Personalização</h1>
            <p className="text-gray-400 font-medium">Lapide a sua identidade visual e exiba as suas conquistas.</p>
          </div>
        </div>
        <Link href={`/profile/${username}`} className="px-6 py-3 bg-white text-black font-black rounded-xl hover:bg-gray-100 transition-all shadow-xl hover:-translate-y-1 shrink-0 flex items-center justify-center gap-2">
          <span>👀</span> Visualizar Perfil
        </Link>
      </div>

      {/* MELHORIAS DE CONTA (EXPANSÕES) */}
      {expansionItems.length > 0 && (
        <section className="bg-green-500/5 border border-green-500/10 rounded-3xl p-6">
          <h3 className="text-xs font-black text-green-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            Melhorias de Conta Ativas
          </h3>
          <div className="flex flex-wrap gap-3">
            {expansionItems.map(item => (
              <div key={item.id} className="bg-background/40 border border-green-500/20 px-4 py-3 rounded-2xl flex items-center gap-3">
                <span className="text-2xl drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]">🏆</span>
                <div>
                  <p className="text-xs font-black text-white">{item.name}</p>
                  <p className="text-[10px] text-gray-500 font-bold uppercase">Upgrade Permanente</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* SEÇÃO 1: PERFIL */}
      <section className="bg-surface/40 backdrop-blur-md border border-border rounded-3xl p-6 md:p-8 shadow-xl">
        <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
          <span className="text-3xl">👤</span> Identidade do Caçador
        </h2>
        <ProfileForm initialUsername={userData?.username || ''} initialBio={userData?.bio || ''} />
      </section>

      {/* SEÇÃO 2: ESTANTE DE JOGOS */}
      <section className="bg-surface/40 backdrop-blur-md border border-border rounded-3xl p-6 md:p-8 shadow-xl">
        <h2 className="text-2xl font-black text-white mb-2 flex items-center gap-3">
          <span className="text-3xl">🏆</span> Vitrine de Ouro
        </h2>
        <p className="text-sm text-gray-400 mb-8">Escolha os jogos que deseja exibir no topo do seu perfil.</p>
        <ShowcaseEditor
          availableGames={myGames}
          initialShowcase={initialShowcase}
          limit={userData?.showcase_limit || 5}
        />
      </section>

      {/* SEÇÃO 3: INVENTÁRIO VISUAL */}
      <section className="space-y-8">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            Inventário <span className="text-gray-500 text-lg font-medium">({cosmeticItems.length})</span>
          </h2>
          <Link href="/shop" className="text-sm font-black text-primary hover:text-blue-400 transition-colors uppercase tracking-widest">
            + Adquirir Mais na Loja
          </Link>
        </div>

        {cosmeticItems.length === 0 ? (
          <div className="bg-surface/30 border border-border border-dashed rounded-3xl p-16 text-center shadow-inner">
            <span className="text-6xl mb-4 block">🕸️</span>
            <h3 className="text-xl font-black text-white mb-2">Inventário Vazio</h3>
            <p className="text-gray-400 text-sm">Visite a loja para destacar o seu perfil!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {cosmeticItems.map((item) => {
              const isEquipped = item.id === equipped.background || item.id === equipped.border || item.id === equipped.title;

              return (
                <div key={item.id} className={`bg-background/80 backdrop-blur-sm border rounded-4xl p-5 flex flex-col gap-5 transition-all duration-300 group ${isEquipped ? 'border-primary shadow-md bg-primary/5' : 'border-white/5 hover:border-white/10 shadow-md'}`}>
                  {/* Preview do Item */}
                  <div className="h-40 bg-surface rounded-3xl flex items-center justify-center relative overflow-hidden border border-border/50 shadow-inner">
                    {item.category === "Fundos Animados" && item.gradient && (
                      <div className="absolute inset-0 w-full h-full opacity-80" style={{ background: item.gradient }}></div>
                    )}

                    {item.category === "Molduras de Avatar" && item.border_style && (
                      <div className="relative w-20 h-20 flex items-center justify-center z-10 transition-transform group-hover:rotate-12">
                        <div className="absolute inset-0 rounded-full p-1" style={{ background: item.border_style }}>
                          <div className="w-full h-full rounded-full bg-background flex items-center justify-center">
                            <span className="text-2xl grayscale group-hover:grayscale-0 transition-all">👤</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {item.category === "Títulos Exclusivos" && item.tag_style && (
                      <div className="relative z-10 px-4 py-2 rounded-xl border border-white/10 text-xs font-black shadow-2xl text-white" style={{ background: item.tag_style }}>
                        {item.name}
                      </div>
                    )}

                    {isEquipped && (
                      <div className="absolute top-3 right-3 bg-primary text-white text-[10px] font-black uppercase px-2 py-1 rounded-lg z-20">
                        Equipado
                      </div>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col justify-between gap-4">
                    <div className="text-center">
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1.5">{item.category}</p>
                      <p className="text-sm font-black text-white truncate px-2">{item.name}</p>
                    </div>
                    <EquipButton itemId={item.id} category={item.category} isEquipped={isEquipped} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}