import React from "react";
import { createClient } from "@/utils/supabase/server";
import Image from "next/image";
import Link from "next/link";
import Trophy from "../components/Trophy";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hall da Fama | Nexus Achievements",
  description: "Os caçadores mais implacáveis do Nexus. Onde lendas são imortalizadas pelo seu suor e conquistas.",
}

interface LeaderboardProps {
  searchParams: Promise<{ sort?: string }>;
}

export default async function LeaderboardPage({ searchParams }: LeaderboardProps) {
  const { sort } = await searchParams;
  const sortBy = sort === 'platinums' ? 'total_platinums' : 'nexus_coins';
  
  const supabase = await createClient();

  // 1. Busca os top 50 jogadores
  const { data: users } = await supabase
    .from("users")
    .select("id, username, avatar_url, nexus_coins, total_platinums, global_level, equipped_border")
    .order(sortBy, { ascending: false })
    .limit(50);

  const top3 = users?.slice(0, 3) || [];
  const rest = users?.slice(3) || [];

  // 2. Busca as molduras personalizadas equipadas (Se o usuário comprou na loja)
  const borderIds = users?.map(u => u.equipped_border).filter(Boolean) || [];
  const borderStyles: Record<string, string> = {};
  
  if (borderIds.length > 0) {
    const { data: borders } = await supabase
      .from("shop_items")
      .select("id, border_style")
      .in("id", borderIds);
      
    borders?.forEach(b => {
      if (b.border_style) borderStyles[b.id] = b.border_style;
    });
  }

  // Estilos padrão do pódio caso o usuário não tenha uma moldura comprada
  const podiumStyles = {
    1: { glow: "shadow-[0_0_60px_rgba(250,204,21,0.3)]", ring: "bg-linear-to-br from-yellow-300 via-yellow-500 to-yellow-700", size: "w-36 h-36 md:w-48 md:h-48", icon: "👑", height: "z-30 -mt-10" },
    2: { glow: "shadow-[0_0_40px_rgba(156,163,175,0.2)]", ring: "bg-linear-to-br from-gray-200 via-gray-400 to-gray-600", size: "w-28 h-28 md:w-36 md:h-36", icon: "🥈", height: "z-20 mt-4 md:mt-10" },
    3: { glow: "shadow-[0_0_40px_rgba(180,83,9,0.2)]", ring: "bg-linear-to-br from-amber-500 via-amber-700 to-amber-900", size: "w-28 h-28 md:w-36 md:h-36", icon: "🥉", height: "z-10 mt-8 md:mt-16" }
  };

  return (
    <div className="space-y-16 animate-in fade-in duration-700 pb-20 max-w-5xl mx-auto px-4 md:px-0">
      
      {/* HEADER DO HALL DA FAMA */}
      <div className="text-center pt-12 space-y-5">
        <div className="inline-block bg-primary/10 border border-primary/20 px-4 py-1.5 rounded-full mb-2">
          <span className="text-xs font-black text-primary uppercase tracking-[0.3em]">Top 50 Global</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter italic drop-shadow-2xl">
          Hall da <span className="text-transparent bg-clip-text bg-linear-to-r from-primary to-purple-500">Fama</span>
        </h1>
        <p className="text-gray-400 font-medium max-w-lg mx-auto leading-relaxed">
          Os caçadores mais implacáveis do Nexus. Lendas são imortalizadas pelo suor das suas conquistas.
        </p>
        
        {/* BOTÕES DE FILTRO */}
        <div className="flex items-center justify-center gap-4 pt-6">
          <Link 
            href="/leaderboards?sort=coins" 
            className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${sortBy === 'nexus_coins' ? 'bg-primary text-white shadow-[0_0_20px_rgba(59,130,246,0.4)] scale-105' : 'bg-surface border border-border text-gray-500 hover:text-white hover:border-gray-600'}`}
          >
            💰 Nexus Coins
          </Link>
          <Link 
            href="/leaderboards?sort=platinums" 
            className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${sortBy === 'total_platinums' ? 'bg-primary text-white shadow-[0_0_20px_rgba(59,130,246,0.4)] scale-105' : 'bg-surface border border-border text-gray-500 hover:text-white hover:border-gray-600'}`}
          >
            🏆 Platinas
          </Link>
        </div>
      </div>

      {/* PÓDIO (TOP 3) MELHORADO */}
      {top3.length > 0 && (
        <div className="flex flex-row items-end justify-center gap-2 md:gap-6 pt-10 pb-10">
          {[2, 1, 3].map((rank) => {
            const p = top3[rank - 1];
            if (!p) return null;

            const style = podiumStyles[rank as keyof typeof podiumStyles];
            const customBorder = p.equipped_border ? borderStyles[p.equipped_border] : null;
            const trophyType = rank === 1 ? 'gold' : rank === 2 ? 'silver' : 'bronze';

            return (
              <div key={p.id} className={`flex flex-col items-center transition-transform hover:-translate-y-2 ${style.height}`}>
                <div className="relative mb-4 group cursor-pointer">
                   {/* Coroa/Medalha */}
                   <div className={`absolute -top-7 left-1/2 -translate-x-1/2 text-3xl md:text-4xl drop-shadow-xl z-20 transition-transform duration-500 group-hover:scale-125 ${rank === 1 ? 'animate-bounce' : ''}`}>
                      {style.icon}
                   </div>
                   
                   {/* Avatar com Moldura */}
                   <Link href={`/profile/${p.username}`} className="block">
                     <div 
                        className={`rounded-full p-1.5 md:p-2 ${style.glow} ${!customBorder ? style.ring : ''}`}
                        style={customBorder ? { background: customBorder } : {}}
                     >
                        <div className={`rounded-full overflow-hidden bg-background border-4 border-background relative ${style.size}`}>
                          {p.avatar_url ? (
                            <Image src={p.avatar_url} alt={p.username} fill className="object-cover" unoptimized />
                          ) : (
                            <div className="w-full h-full bg-linear-to-br from-gray-800 to-black flex items-center justify-center text-4xl md:text-6xl font-black text-gray-600 uppercase">{p.username.charAt(0)}</div>
                          )}
                        </div>
                     </div>
                   </Link>
                   
                   {/* Etiqueta de Posição */}
                   <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-background border border-white/10 px-3 py-1 rounded-lg text-[10px] font-black text-white shadow-xl z-20">
                     #{rank}
                   </div>
                </div>
                
                {/* Informações do Jogador */}
                <div className="text-center mt-2 bg-surface/50 backdrop-blur-md border border-white/5 px-4 py-3 rounded-2xl shadow-xl min-w-30 md:min-w-40">
                  <p className="font-black text-white text-sm md:text-lg truncate max-w-25 md:max-w-35 mx-auto">{p.username}</p>
                  <div className="flex items-center justify-center gap-1.5 mt-1.5 bg-background/80 rounded-lg py-1 px-2 border border-white/5">
                     <Trophy type={trophyType} className="w-4 h-4 md:w-5 md:h-5" />
                     <span className="text-[10px] md:text-xs font-black text-gray-300 uppercase tracking-wider">
                        {sortBy === 'nexus_coins' ? `${p.nexus_coins.toLocaleString()}` : `${p.total_platinums}`}
                     </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* LISTA DO RESTANTE (4º ao 50º) EM FORMATO DE CARTÕES */}
      <div className="max-w-4xl mx-auto space-y-3">
        {rest.map((p, index) => {
          const position = index + 4;
          const customBorder = p.equipped_border ? borderStyles[p.equipped_border] : null;

          return (
            <Link 
              key={p.id} 
              href={`/profile/${p.username}`} 
              className="flex items-center gap-4 bg-surface/30 backdrop-blur-md border border-white/5 p-3 md:p-4 rounded-2xl hover:bg-surface/80 hover:border-primary/30 transition-all duration-300 group shadow-sm hover:shadow-xl hover:-translate-y-0.5"
            >
              {/* Posição */}
              <div className="w-10 text-center shrink-0">
                <span className="font-black text-gray-500 text-sm md:text-base group-hover:text-white transition-colors">#{position}</span>
              </div>

              {/* Avatar da Lista com Moldura Opcional */}
              <div 
                className="shrink-0 rounded-full p-0.75 transition-transform duration-500 group-hover:scale-110"
                style={customBorder ? { background: customBorder } : { background: '#27272a' }}
              >
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden bg-background border-2 border-background relative">
                  {p.avatar_url ? (
                    <Image src={p.avatar_url} alt="" fill className="object-cover" unoptimized />
                  ) : (
                    <span className="flex items-center justify-center w-full h-full text-base font-black text-gray-500 bg-linear-to-br from-gray-800 to-black uppercase">{p.username.charAt(0)}</span>
                  )}
                </div>
              </div>

              {/* Dados do Usuário */}
              <div className="flex-1 min-w-0 flex flex-col md:flex-row md:items-center justify-between gap-1 md:gap-4">
                <div className="flex items-center gap-3">
                  <span className="font-black text-white text-sm md:text-base truncate group-hover:text-primary transition-colors">{p.username}</span>
                  <span className="hidden md:inline-flex text-[10px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20">LVL {p.global_level || 1}</span>
                </div>
                
                {/* Score */}
                <div className="flex items-center gap-2 md:justify-end text-sm md:text-base font-black text-white bg-background/50 md:bg-transparent px-3 py-1 md:p-0 rounded-lg w-fit">
                  {sortBy === 'nexus_coins' ? (
                    <><span className="text-yellow-500 text-lg">🪙</span> {p.nexus_coins.toLocaleString()}</>
                  ) : (
                    <><Trophy type="platinum" className="w-5 h-5" /> {p.total_platinums}</>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>

    </div>
  );
}