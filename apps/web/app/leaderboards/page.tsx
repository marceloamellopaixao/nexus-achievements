import React from "react";
import { createClient } from "@/utils/supabase/server";
import Image from "next/image";
import Link from "next/link";
import Trophy from "../components/Trophy";
import { Metadata } from "next";

// Ícones Modernos
import { FaArrowLeft, FaArrowRight, FaCrown, FaMedal } from "react-icons/fa";
import { BiSolidCoinStack } from "react-icons/bi";

export const metadata: Metadata = {
  title: "Hall da Fama | Nexus Achievements",
  description: "Os caçadores mais implacáveis do Nexus. Onde lendas são imortalizadas pelo seu suor e conquistas.",
}

interface LeaderboardProps {
  searchParams: Promise<{ sort?: string; page?: string }>;
}

export default async function LeaderboardPage({ searchParams }: LeaderboardProps) {
  const { sort, page } = await searchParams;
  const currentPath = `/leaderboards`;
  const sortBy = sort === 'platinums' ? 'total_platinums' : 'nexus_coins';

  // PAGINAÇÃO: Configurações
  const currentPage = Number(page) || 1;
  const ITEMS_PER_PAGE = 50;
  const from = (currentPage - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  const supabase = await createClient();

  // Busca os jogadores com paginação e contagem total
  const { data: users, count } = await supabase
    .from("users")
    .select("id, username, avatar_url, nexus_coins, total_platinums, global_level, equipped_border", { count: 'exact' })
    .order(sortBy, { ascending: false })
    .range(from, to);

  // Lógica de visualização: O Pódio só aparece na primeira página
  const isFirstPage = currentPage === 1;
  const top3 = isFirstPage ? (users?.slice(0, 3) || []) : [];
  const rest = isFirstPage ? (users?.slice(3) || []) : (users || []);

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

  // Estilos do pódio
  const podiumStyles = {
    1: { glow: "shadow-[0_0_60px_rgba(250,204,21,0.3)]", ring: "bg-linear-to-br from-yellow-300 via-yellow-500 to-yellow-700", size: "w-28 h-28 sm:w-36 sm:h-36 md:w-48 md:h-48", icon: <FaCrown className="text-yellow-400 drop-shadow-lg" />, height: "z-30 -mt-6 md:-mt-10" },
    2: { glow: "shadow-[0_0_40px_rgba(156,163,175,0.2)]", ring: "bg-linear-to-br from-gray-200 via-gray-400 to-gray-600", size: "w-20 h-20 sm:w-28 sm:h-28 md:w-36 md:h-36", icon: <FaMedal className="text-gray-300 drop-shadow-md" />, height: "z-20 mt-4 sm:mt-8 md:mt-10" },
    3: { glow: "shadow-[0_0_40px_rgba(180,83,9,0.2)]", ring: "bg-linear-to-br from-amber-500 via-amber-700 to-amber-900", size: "w-20 h-20 sm:w-28 sm:h-28 md:w-36 md:h-36", icon: <FaMedal className="text-amber-600 drop-shadow-md" />, height: "z-10 mt-8 sm:mt-12 md:mt-16" }
  };

  // Funções de URL para paginação
  const totalPages = Math.ceil((count || 0) / ITEMS_PER_PAGE);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  const buildUrl = (pageNumber: number) => {
    const sp = new URLSearchParams();
    if (sort) sp.set('sort', sort);
    sp.set('page', pageNumber.toString());
    return `/leaderboards?${sp.toString()}`;
  };

  return (
    <div className="space-y-12 md:space-y-16 animate-in fade-in duration-700 pb-20 max-w-5xl mx-auto px-4 md:px-0 mt-4 md:mt-0">

      {/* HEADER DO HALL DA FAMA */}
      <div className="text-center md:pt-12 space-y-4 md:space-y-5">
        <div className="inline-block bg-primary/10 border border-primary/20 px-4 py-1.5 rounded-full mb-2 shadow-inner">
          <span className="text-[10px] md:text-xs font-black text-primary uppercase tracking-[0.3em]">Top Global</span>
        </div>
        <h1 className="text-4xl md:text-7xl font-black text-white tracking-tighter italic drop-shadow-2xl">
          Hall da <span className="text-transparent bg-clip-text bg-linear-to-r from-primary to-purple-500">Fama</span>
        </h1>
        <p className="text-sm md:text-base text-gray-400 font-medium max-w-lg mx-auto leading-relaxed px-4">
          Os caçadores mais implacáveis do Nexus. Lendas são imortalizadas pelo suor das suas conquistas.
        </p>

        {/* BOTÕES DE FILTRO */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4 pt-6 max-w-xs sm:max-w-none mx-auto">
          <Link
            href="/leaderboards?sort=coins&page=1"
            className={`w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 md:py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${sortBy === 'nexus_coins' ? 'bg-primary text-white shadow-[0_0_20px_rgba(59,130,246,0.4)] scale-105' : 'bg-surface border border-white/5 text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <BiSolidCoinStack className="text-lg text-yellow-500" /> Nexus Coins
          </Link>
          <Link
            href="/leaderboards?sort=platinums&page=1"
            className={`w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3.5 md:py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${sortBy === 'total_platinums' ? 'bg-primary text-white shadow-[0_0_20px_rgba(59,130,246,0.4)] scale-105' : 'bg-surface border border-white/5 text-gray-400 hover:text-white hover:bg-white/5'}`}
          >
            <Trophy type="platinum" className="w-5 h-5" /> Platinas
          </Link>
        </div>
      </div>

      {/* PÓDIO (TOP 3 - APENAS NA PRIMEIRA PÁGINA) */}
      {isFirstPage && top3.length > 0 && (
        <div className="flex flex-row items-end justify-center gap-3 sm:gap-6 md:gap-8 pt-8 md:pt-10 pb-6 md:pb-10">
          {[2, 1, 3].map((rank) => {
            const p = top3[rank - 1];
            if (!p) return null;

            const style = podiumStyles[rank as keyof typeof podiumStyles];
            const customBorder = p.equipped_border ? borderStyles[p.equipped_border] : null;
            const trophyType = rank === 1 ? 'gold' : rank === 2 ? 'silver' : 'bronze';

            return (
              <div key={p.id} className={`flex flex-col items-center transition-transform hover:-translate-y-2 ${style.height}`}>
                <div className="relative mb-3 md:mb-4 group cursor-pointer shrink-0">
                  <div className={`absolute -top-6 md:-top-8 left-1/2 -translate-x-1/2 text-2xl md:text-4xl z-20 transition-transform duration-500 group-hover:scale-125 ${rank === 1 ? 'animate-bounce' : ''}`}>
                    {style.icon}
                  </div>

                  <Link href={`/profile/${p.username}?back=${encodeURIComponent(currentPath)}`} className="block">
                    <div
                      className={`rounded-full p-1.5 md:p-2 ${style.glow} ${!customBorder ? style.ring : ''}`}
                      style={customBorder ? { background: customBorder } : {}}
                    >
                      <div className={`rounded-full overflow-hidden bg-background border-4 border-background relative ${style.size}`}>
                        {p.avatar_url ? (
                          <Image src={p.avatar_url} alt={p.username} fill className="object-cover" unoptimized />
                        ) : (
                          <div className="w-full h-full bg-surface flex items-center justify-center text-3xl sm:text-4xl md:text-6xl font-black text-primary uppercase">{p.username.charAt(0)}</div>
                        )}
                      </div>
                    </div>
                  </Link>

                  <div className="absolute -bottom-2 md:-bottom-3 left-1/2 -translate-x-1/2 bg-background border border-white/10 px-2.5 md:px-3 py-0.5 md:py-1 rounded-lg text-[10px] md:text-xs font-black text-white shadow-xl z-20">
                    #{rank}
                  </div>
                </div>

                <div className="text-center mt-1 md:mt-2 bg-surface/50 backdrop-blur-md border border-white/5 px-2 md:px-4 py-2 md:py-3 rounded-xl md:rounded-2xl shadow-xl w-full max-w-22.5 sm:max-w-none sm:min-w-32 md:min-w-40">
                  <p className="font-black text-white text-[10px] sm:text-xs md:text-lg truncate w-full">{p.username}</p>
                  <div className="flex items-center justify-center gap-1 sm:gap-1.5 mt-1 sm:mt-1.5 bg-background/80 rounded-lg py-1 px-1.5 sm:px-2 border border-white/5 mx-auto w-fit">
                    {sortBy === 'nexus_coins' ? (
                      <BiSolidCoinStack className="text-yellow-500 text-[10px] md:text-sm" />
                    ) : (
                      <Trophy type={trophyType} className="w-3 h-3 md:w-5 md:h-5" />
                    )}
                    <span className="text-[9px] sm:text-[10px] md:text-xs font-black text-gray-300 uppercase tracking-wider">
                      {sortBy === 'nexus_coins' ? `${p.nexus_coins.toLocaleString()}` : `${p.total_platinums}`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* LISTA DO RESTANTE (Cartões) */}
      <div className="max-w-4xl mx-auto space-y-3">
        {rest.map((p, index) => {
          // O rank muda consoante a página atual
          const position = isFirstPage ? index + 4 : from + index + 1;
          const customBorder = p.equipped_border ? borderStyles[p.equipped_border] : null;

          return (
            <Link
              key={p.id}
              href={`/profile/${p.username}?back=${encodeURIComponent(currentPath)}`}
              className="flex items-center gap-3 md:gap-4 bg-surface/30 backdrop-blur-md border border-white/5 p-3 md:p-4 rounded-2xl hover:bg-surface/80 hover:border-primary/30 transition-all duration-300 group shadow-sm hover:shadow-xl hover:-translate-y-0.5"
            >
              {/* Posição */}
              <div className="w-8 md:w-12 text-center shrink-0">
                <span className="font-black text-gray-500 text-xs md:text-base group-hover:text-white transition-colors">#{position}</span>
              </div>

              {/* Avatar da Lista */}
              <div
                className="shrink-0 rounded-full p-0.5 md:p-0.75 transition-transform duration-500 group-hover:scale-110"
                style={customBorder ? { background: customBorder } : { background: '#27272a' }}
              >
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden bg-background border-2 border-background relative">
                  {p.avatar_url ? (
                    <Image src={p.avatar_url} alt="" fill className="object-cover" unoptimized />
                  ) : (
                    <span className="flex items-center justify-center w-full h-full text-base font-black text-primary bg-primary/10 uppercase">{p.username.charAt(0)}</span>
                  )}
                </div>
              </div>

              {/* Dados do Usuário */}
              <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 pr-1">
                <div className="flex items-center gap-2 md:gap-3 min-w-0">
                  <span className="font-black text-white text-sm md:text-base truncate group-hover:text-primary transition-colors max-w-30 sm:max-w-50 md:max-w-none">{p.username}</span>
                  <span className="hidden sm:inline-flex text-[9px] md:text-[10px] font-black bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20 shrink-0">LVL {p.global_level || 1}</span>
                </div>

                {/* Score */}
                <div className="flex items-center gap-1.5 sm:gap-2 sm:justify-end text-xs sm:text-sm md:text-base font-black text-white bg-background/50 sm:bg-transparent px-2.5 sm:px-0 py-1 sm:py-0 rounded-lg w-fit">
                  {sortBy === 'nexus_coins' ? (
                    <><BiSolidCoinStack className="text-yellow-500 text-sm md:text-lg" /> {p.nexus_coins.toLocaleString()}</>
                  ) : (
                    <><Trophy type="platinum" className="w-4 h-4 md:w-5 md:h-5" /> {p.total_platinums}</>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* CONTROLES DE PAGINAÇÃO */}
      {totalPages > 1 && (
        <div className="max-w-4xl mx-auto flex items-center justify-between border-t border-white/5 pt-8 mt-10">
          <Link
            href={hasPrevPage ? buildUrl(currentPage - 1) : '#'}
            className={`px-6 py-3 rounded-xl font-black text-sm transition-all ${hasPrevPage ? 'bg-surface border border-white/10 text-white hover:bg-primary hover:border-primary' : 'bg-surface/30 border border-transparent text-gray-600 cursor-not-allowed pointer-events-none'}`}
          >
            <FaArrowLeft className="inline mr-2" /> Anterior
          </Link>

          <span className="text-gray-400 font-bold text-sm hidden sm:block">
            Página <span className="text-white">{currentPage}</span> de {totalPages}
          </span>

          <Link
            href={hasNextPage ? buildUrl(currentPage + 1) : '#'}
            className={`px-6 py-3 rounded-xl font-black text-sm transition-all ${hasNextPage ? 'bg-surface border border-white/10 text-white hover:bg-primary hover:border-primary' : 'bg-surface/30 border border-transparent text-gray-600 cursor-not-allowed pointer-events-none'}`}
          >
            Próxima <FaArrowRight className="inline ml-2 rotate-180" />
          </Link>
        </div>
      )}

    </div>
  );
}