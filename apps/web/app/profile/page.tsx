import React from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import Image from "next/image";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile = null;
  // Criamos um objeto para guardar tanto o estilo (CSS) quanto o nome (Texto) do título
  const equippedStyles = { 
    background: null as string | null, 
    border: null as string | null, 
    titleStyle: null as string | null,
    titleName: null as string | null 
  };

  if (user) {
    // 1. Busca os dados do utilizador
    const { data } = await supabase.from("users").select("*").eq("id", user.id).single();
    profile = data;

    // 2. Busca os detalhes dos itens equipados
    const equippedIds = [data?.equipped_background, data?.equipped_border, data?.equipped_title].filter(Boolean);
    
    if (equippedIds.length > 0) {
      const { data: shopItems } = await supabase.from("shop_items").select("*").in("id", equippedIds);
      
      if (shopItems) {
        equippedStyles.background = shopItems.find((i) => i.id === data.equipped_background)?.gradient || null;
        equippedStyles.border = shopItems.find((i) => i.id === data.equipped_border)?.border_style || null;
        
        // Aqui pegamos o ESTILO e o NOME do item de título
        const titleItem = shopItems.find((i) => i.id === data.equipped_title);
        equippedStyles.titleStyle = titleItem?.tag_style || null;
        equippedStyles.titleName = titleItem?.name || null;
      }
    }
  }

  const joinDate = profile?.created_at ? new Date(profile.created_at).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }) : 'Desconhecido';

  // Mock da estante (será dinâmico na Task de APIs)
  const showcase = [
    { id: 1, title: "Bloodborne", platform: "PSN", gradient: "from-gray-800 to-black", icon: "🩸" },
    { id: 2, title: "Sekiro", platform: "Steam", gradient: "from-orange-900 to-black", icon: "⚔️" },
    { id: 3, title: "Hollow Knight", platform: "Steam", gradient: "from-blue-900 to-black", icon: "🪲" },
    { id: 4, title: "Hades", platform: "Epic", gradient: "from-red-900 to-black", icon: "🔥" },
    { id: 5, title: "Celeste", platform: "Xbox", gradient: "from-purple-900 to-black", icon: "🍓" },
  ];

  if (!profile) return <div className="text-white p-10 text-center font-bold">Carregando perfil...</div>;

  // Lógica de cores dinâmicas
  const bannerClass = equippedStyles.background ? `bg-linear-to-r ${equippedStyles.background}` : "bg-linear-to-r from-primary/40 via-purple-900/40 to-background";
  const avatarBorderClass = equippedStyles.border ? `border-4 ${equippedStyles.border}` : "border-4 border-background";

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 max-w-5xl mx-auto">
      
      <div className="relative bg-surface border border-border rounded-2xl overflow-hidden mt-4 shadow-xl">
        
        {/* BANNER */}
        <div className={`h-48 md:h-64 relative border-b border-border shadow-inner transition-all duration-700 ${bannerClass}`}>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 mix-blend-overlay"></div>
        </div>

        <div className="px-6 pb-6 relative flex flex-col md:flex-row md:items-end gap-6 -mt-12 md:-mt-16">
          
          {/* AVATAR COM MOLDURA EQUIPADA */}
          <div className={`relative w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-surface flex items-center justify-center shrink-0 z-10 transition-all duration-700 ${avatarBorderClass}`}>
            {profile.avatar_url ? (
              <Image src={profile.avatar_url} alt={profile.username} fill className="rounded-xl object-cover" />
            ) : (
              <span className="text-4xl font-bold text-white">{profile.username.charAt(0).toUpperCase()}</span>
            )}
          </div>

          <div className="flex-1 space-y-1 mb-2">
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight flex items-center gap-3">
              {profile.username}
              <span className="text-xs font-bold bg-primary/20 text-primary border border-primary/50 px-2 py-1 rounded-md uppercase tracking-wider">
                Lvl {profile.global_level || 1}
              </span>
            </h1>
            
            {/* TÍTULO DINÂMICO */}
            <div className="flex items-center">
                {equippedStyles.titleStyle ? (
                <span className={`inline-block px-3 py-1 rounded-md border text-xs font-bold mt-1 shadow-sm transition-all ${equippedStyles.titleStyle}`}>
                    {equippedStyles.titleName}
                </span>
                ) : (
                <p className="text-primary font-medium">{profile.title}</p>
                )}
            </div>
          </div>

          <div className="mb-2">
            <Link href="/profile/studio" className="inline-block w-full md:w-auto text-center px-6 py-2.5 bg-white text-black hover:bg-gray-200 rounded-lg font-bold text-sm transition-colors shadow-md">
              ⚙️ Customizar Perfil
            </Link>
          </div>
        </div>

        <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-white/5">
          <div className="md:col-span-2">
            <p className="text-gray-300 leading-relaxed text-sm md:text-base italic">
              &quot;{profile.bio}&quot;
            </p>
            <p className="text-xs text-gray-500 mt-3 font-medium uppercase tracking-wider">
                📅 MEMBRO DESDE {joinDate.toUpperCase()}
            </p>
          </div>
          <div className="flex gap-4 md:justify-end items-center">
            <div className="text-center bg-background/50 border border-border px-4 py-2 rounded-xl min-w-20">
              <p className="text-2xl font-black text-white">{profile.total_games}</p>
              <p className="text-[10px] text-gray-500 font-bold uppercase">Jogos</p>
            </div>
            <div className="text-center bg-background/50 border border-border px-4 py-2 rounded-xl min-w-20 relative overflow-hidden group">
              <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors"></div>
              <p className="text-2xl font-black text-blue-400 relative z-10">{profile.total_platinums}</p>
              <p className="text-[10px] text-gray-500 font-bold uppercase relative z-10">Platinas</p>
            </div>
          </div>
        </div>
      </div>

      {/* ESTANTE DE TROFÉUS */}
      <div className="space-y-4 pt-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">🏆 Estante de Troféus</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {showcase.map((game) => (
            <div key={game.id} className={`relative aspect-3/4 rounded-xl border border-border/50 bg-linear-to-b ${game.gradient} p-4 flex flex-col justify-between group hover:border-primary/50 transition-all cursor-pointer overflow-hidden shadow-lg`}>
              <div className="absolute top-2 right-2 text-[10px] font-bold text-white/70 bg-black/40 px-1.5 py-0.5 rounded backdrop-blur-md border border-white/10">{game.platform}</div>
              <div className="flex-1 flex items-center justify-center"><span className="text-5xl group-hover:scale-110 transition-transform duration-300 drop-shadow-2xl">{game.icon}</span></div>
              <div className="text-center mt-2 relative z-10">
                <p className="font-bold text-white text-sm truncate drop-shadow-md">{game.title}</p>
                <div className="w-8 h-1 bg-primary/50 mx-auto mt-1 rounded-full group-hover:w-full group-hover:bg-primary transition-all duration-300"></div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}