import React from "react";
import { createClient } from "@/utils/supabase/server";
import Image from "next/image";
import Link from "next/link";
import Trophy from "../components/Trophy";

interface LeaderboardProps {
  searchParams: Promise<{ sort?: string }>;
}

export default async function LeaderboardPage({ searchParams }: LeaderboardProps) {
  const { sort } = await searchParams;
  const sortBy = sort === 'platinums' ? 'total_platinums' : 'nexus_coins';
  
  const supabase = await createClient();

  // Busca os top 50 jogadores
  const { data: users } = await supabase
    .from("users")
    .select("id, username, avatar_url, nexus_coins, total_platinums, global_level, equipped_border")
    .order(sortBy, { ascending: false })
    .limit(50);

  const top3 = users?.slice(0, 3) || [];
  const rest = users?.slice(3) || [];

  return (
    <div className="space-y-12 animate-in fade-in duration-700 pb-20 max-w-5xl mx-auto px-4 md:px-0">
      
      {/* HEADER DO HALL DA FAMA */}
      <div className="text-center pt-12 space-y-4">
        <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter italic drop-shadow-2xl">
          Hall da <span className="text-primary">Fama</span>
        </h1>
        <p className="text-gray-400 font-medium max-w-lg mx-auto leading-relaxed">
          Os caçadores mais implacáveis do Nexus. Onde lendas são imortalizadas pelo seu suor e conquistas.
        </p>
        
        {/* BOTÕES DE FILTRO */}
        <div className="flex items-center justify-center gap-4 pt-6">
          <Link 
            href="/leaderboards?sort=coins" 
            className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all ${sortBy === 'nexus_coins' ? 'bg-primary text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'bg-surface text-gray-500 hover:text-white'}`}
          >
            💰 Nexus Coins
          </Link>
          <Link 
            href="/leaderboards?sort=platinums" 
            className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all ${sortBy === 'total_platinums' ? 'bg-primary text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'bg-surface text-gray-500 hover:text-white'}`}
          >
            🏆 Platinas
          </Link>
        </div>
      </div>

      {/* PODIUM (TOP 3) */}
      <div className="flex flex-col md:flex-row items-end justify-center gap-6 md:gap-4 pt-10">
        {top3.map((player, index) => {
          const rank = index === 0 ? 2 : index === 1 ? 1 : 3; // Ordem visual: 2º, 1º, 3º
          const p = top3[rank - 1];
          if (!p) return null;

          const isFirst = rank === 1;
          const trophyType = rank === 1 ? 'gold' : rank === 2 ? 'silver' : 'bronze';

          return (
            <div key={p.id} className={`flex flex-col items-center gap-4 ${isFirst ? 'order-1 md:order-2 z-20' : rank === 2 ? 'order-2 md:order-1' : 'order-3'}`}>
              <div className="relative">
                 {/* Coroa ou Indicador de Rank */}
                 <div className={`absolute -top-6 left-1/2 -translate-x-1/2 text-2xl drop-shadow-md ${isFirst ? 'animate-bounce' : ''}`}>
                    {rank === 1 ? '👑' : rank === 2 ? '🥈' : '🥉'}
                 </div>
                 
                 <Link href={`/profile/${p.username}`} className={`block rounded-full border-4 overflow-hidden shadow-2xl transition-transform hover:scale-110 ${isFirst ? 'w-32 h-32 md:w-44 md:h-44 border-yellow-500/50' : 'w-24 h-24 md:w-32 md:h-32 border-white/20'}`}>
                    {p.avatar_url ? (
                      <Image src={p.avatar_url} alt={p.username} fill className="object-cover" unoptimized />
                    ) : (
                      <div className="w-full h-full bg-surface flex items-center justify-center text-4xl font-black text-gray-500 uppercase">{p.username.charAt(0)}</div>
                    )}
                 </Link>
              </div>
              
              <div className="text-center">
                <p className="font-black text-white text-lg drop-shadow-md">{p.username}</p>
                <div className="flex items-center justify-center gap-2 mt-1">
                   <Trophy type={trophyType} className="w-5 h-5" />
                   <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                      {sortBy === 'nexus_coins' ? `${p.nexus_coins.toLocaleString()} Moedas` : `${p.total_platinums} Platinas`}
                   </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* LISTA DO RESTANTE (4º ao 50º) */}
      <div className="bg-surface/40 backdrop-blur-xl border border-border/60 rounded-[2.5rem] overflow-hidden shadow-2xl">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-background/40 border-b border-border/50">
              <th className="px-8 py-5 text-left text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Posição</th>
              <th className="px-8 py-5 text-left text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Caçador</th>
              <th className="px-8 py-5 text-right text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Nível</th>
              <th className="px-8 py-5 text-right text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Progresso</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {rest.map((p, index) => (
              <tr key={p.id} className="group hover:bg-white/5 transition-colors">
                <td className="px-8 py-5">
                  <span className="font-mono text-gray-500 font-bold">#{index + 4}</span>
                </td>
                <td className="px-8 py-5">
                  <Link href={`/profile/${p.username}`} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-background border border-white/10 overflow-hidden relative shadow-inner">
                       {p.avatar_url ? <Image src={p.avatar_url} alt="" fill className="object-cover" unoptimized /> : <span className="flex items-center justify-center w-full h-full text-sm font-black text-gray-600">{p.username.charAt(0)}</span>}
                    </div>
                    <span className="font-bold text-white group-hover:text-primary transition-colors">{p.username}</span>
                  </Link>
                </td>
                <td className="px-8 py-5 text-right">
                  <span className="text-xs font-black bg-primary/10 text-primary px-2.5 py-1 rounded-lg border border-primary/20">Lvl {p.global_level || 1}</span>
                </td>
                <td className="px-8 py-5 text-right font-black text-white">
                  {sortBy === 'nexus_coins' ? (
                    <span className="flex items-center justify-end gap-2 italic">🪙 {p.nexus_coins.toLocaleString()}</span>
                  ) : (
                    <span className="flex items-center justify-end gap-2 italic">🏆 {p.total_platinums}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}