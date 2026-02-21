import React from "react";
import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
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

type InventoryResult = {
  item_id: string;
  shop_items: ShopItem | null;
};

interface StudioPageProps {
  params: Promise<{ username: string }>;
}

export default async function StudioPage({ params }: StudioPageProps) {
  const { username } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
      <span className="text-6xl mb-2 drop-shadow-md">🔒</span>
      <h2 className="text-2xl font-black text-white">Acesso Restrito</h2>
      <p className="text-gray-400 font-bold text-center">Inicie sessão no Nexus para aceder ao seu Estúdio de Customização.</p>
    </div>
  );

  const { data: userData } = await supabase
    .from("users")
    .select("username, bio, equipped_background, equipped_border, equipped_title, showcase_games, showcase_limit")
    .eq("id", user.id)
    .single();

  if (userData?.username !== username) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <span className="text-6xl mb-2 drop-shadow-md">🛑</span>
        <h2 className="text-2xl font-black text-white">Área Privada</h2>
        <p className="text-gray-400 font-bold text-center">Você só pode editar o seu próprio perfil.</p>
      </div>
    );
  }

  // Busca TODOS os jogos, o ShowcaseEditor vai lidar com a exibição paginada/com scroll
  const { data: allGames } = await supabase
    .from("games")
    .select("id, title, cover_url")
    .order('title');

  const { data: inventoryData } = await supabase
    .from("user_inventory")
    .select(`item_id, shop_items (id, name, category, rarity_type, gradient, border_style, tag_style)`)
    .eq("user_id", user.id);

  const inventoryRecords = inventoryData as unknown as InventoryResult[] | null;

  const myItems = (inventoryRecords
    ?.map(inv => inv.shop_items)
    .filter(Boolean) as ShopItem[]) || [];

  const equipped = {
    background: userData?.equipped_background,
    border: userData?.equipped_border,
    title: userData?.equipped_title,
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pb-20 max-w-5xl mx-auto px-4 md:px-0">

      {/* =========================================
          HEADER DO ESTÚDIO
          ========================================= */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-8 border-b border-border/50 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-3xl border border-primary/20 shadow-inner shrink-0">
            🎨
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight drop-shadow-md">Estúdio do Nexus</h1>
            <p className="text-gray-400 mt-1 font-medium">Lapide a sua identidade visual e exiba as suas conquistas.</p>
          </div>
        </div>
        <Link href={`/profile/${username}`} className="px-6 py-3 bg-white text-black font-black rounded-xl hover:bg-gray-200 transition-all shadow-[0_0_15px_rgba(255,255,255,0.2)] hover:scale-105 shrink-0 flex items-center justify-center gap-2">
          Voltar ao Perfil
        </Link>
      </div>

      {/* =========================================
          SEÇÃO 1: INFORMAÇÕES PESSOAIS (Form)
          ========================================= */}
      <section className="bg-surface/40 backdrop-blur-md border border-border rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl pointer-events-none"></div>
        <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3 relative z-10">
          <span className="text-3xl">👤</span> Identidade do Caçador
        </h2>
        <div className="relative z-10">
          <ProfileForm
            initialUsername={userData?.username || ''}
            initialBio={userData?.bio || ''}
          />
        </div>
      </section>

      {/* =========================================
          SEÇÃO 2: ESTANTE DE JOGOS (Editor)
          ========================================= */}
      <section className="bg-surface/40 backdrop-blur-md border border-border rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <h2 className="text-2xl font-black text-white mb-2 flex items-center gap-3 relative z-10">
          <span className="text-3xl">🏆</span> Vitrine de Ouro
        </h2>
        <p className="text-sm text-gray-400 mb-8 relative z-10">Escolha as platinas ou os jogos de que mais se orgulha para exibir no topo do seu perfil.</p>
        <div className="relative z-10">
          <ShowcaseEditor
            availableGames={allGames || []}
            initialShowcase={userData?.showcase_games || []}
            limit={userData?.showcase_limit || 5}
          />
        </div>
      </section>

      {/* =========================================
          SEÇÃO 3: INVENTÁRIO VISUAL
          ========================================= */}
      <section className="pt-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-black text-white flex items-center gap-3">
              Inventário Visual <span className="text-3xl">🎁</span>
            </h2>
            <p className="text-sm text-gray-400 mt-1">Cosméticos adquiridos na Loja de Pontos.</p>
          </div>
          <Link href="/shop" className="px-5 py-2.5 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 font-bold rounded-xl text-sm hover:bg-yellow-500/20 transition-all shadow-[0_0_15px_rgba(234,179,8,0.1)] shrink-0 flex items-center justify-center gap-2">
            🛒 Ir à Loja
          </Link>
        </div>

        {myItems.length === 0 ? (
          <div className="bg-surface/30 border border-border border-dashed rounded-3xl p-16 text-center flex flex-col items-center justify-center shadow-inner">
            <span className="text-6xl mb-4 drop-shadow-md">🕸️</span>
            <h3 className="text-xl font-black text-white mb-2">Inventário Vazio</h3>
            <p className="text-gray-400 text-sm max-w-sm">Você ainda não comprou nenhum cosmético. Visite a loja e gaste as suas Nexus Coins para destacar o seu perfil!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {myItems.map((item) => {
              const isEquipped = item.id === equipped.background || item.id === equipped.border || item.id === equipped.title;

              return (
                <div key={item.id} className={`bg-background/80 backdrop-blur-sm border rounded-3xl p-5 flex flex-col gap-5 transition-all duration-300 group hover:-translate-y-1 ${isEquipped ? 'border-primary shadow-[0_0_20px_rgba(59,130,246,0.15)] bg-primary/5' : 'border-border/50 hover:border-border shadow-md hover:shadow-xl'}`}>
                  
                  {/* Caixa de Exibição do Item */}
                  <div className="h-32 bg-surface rounded-2xl flex items-center justify-center relative overflow-hidden border border-border/50 shadow-inner group-hover:border-border transition-colors">
                    
                    {/* Background */}
                    {item.gradient && (
                      <div className="absolute inset-0 w-full h-full opacity-90 transition-transform duration-700 group-hover:scale-105" style={{ background: item.gradient }}></div>
                    )}

                    {/* Moldura Avatar */}
                    {item.border_style && (
                      <div className="relative z-10 w-16 h-16 rounded-full border-[5px] bg-background shadow-xl" style={{ borderImage: item.border_style, borderImageSlice: 1 }}></div>
                    )}

                    {/* Tag de Título */}
                    {item.tag_style && (
                      <div className="relative z-10 px-4 py-1.5 rounded-lg border border-white/20 text-xs font-black shadow-lg" style={{ background: item.tag_style }}>
                        {item.name}
                      </div>
                    )}

                    {/* Selo 'Em Uso' */}
                    {isEquipped && (
                      <div className="absolute top-2 right-2 bg-primary text-white text-[10px] font-black uppercase px-2 py-1 rounded-md z-20 shadow-md">
                        Equipado
                      </div>
                    )}
                  </div>

                  {/* Detalhes e Botão */}
                  <div className="flex-1 flex flex-col justify-between gap-4">
                    <div className="text-center">
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-1.5">{item.category}</p>
                      <p className="text-sm font-black text-white truncate px-2">{item.name}</p>
                    </div>
                    <div className="w-full">
                      <EquipButton itemId={item.id} category={item.category} isEquipped={isEquipped} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

    </div>
  );
}