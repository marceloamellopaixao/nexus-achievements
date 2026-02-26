import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import GameCardImage from "@/app/components/GameCardImage";
import { Metadata } from "next";
import ClientBackButton from "@/app/components/ClientBackButton";

// Ícones Modernos e Épicos
import { GiCrossedSwords, GiDeathSkull } from "react-icons/gi";
import { FaFire, FaMedal, FaGamepad, FaCrown, FaBed, FaArrowRight, FaArrowLeft } from "react-icons/fa";

export const metadata: Metadata = {
  title: "Comparar Perfil | Nexus Achievements",
  description: "Compare seu perfil de conquistas com outros membros da comunidade do Nexus Achievements.",
}

interface ComparePageProps {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ back?: string; page?: string }>; 
}

export default async function ComparePage({ params, searchParams }: ComparePageProps) {
  const { username: targetUsername } = await params;
  const { back, page } = await searchParams;
  const currentPage = Number(page) || 1;
  const ITEMS_PER_PAGE = 20;

  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) return notFound();

  const backUrl = back ? back : `/profile/${targetUsername}`;

  // 1. Busca os dois perfis
  const { data: me } = await supabase.from("users").select("*").eq("id", authUser.id).single();
  const { data: opponent } = await supabase.from("users").select("*").eq("username", targetUsername).single();

  if (!opponent || !me) return notFound();

  // 2. Busca todos os jogos de ambos para encontrar o "Match" global
  const [{ data: myGames }, { data: opponentGames }] = await Promise.all([
    supabase.from("user_games").select("*, games(*)").eq("user_id", me.id),
    supabase.from("user_games").select("*, games(*)").eq("user_id", opponent.id)
  ]);

  const commonGames = myGames?.filter(myG => 
    opponentGames?.some(opG => opG.game_id === myG.game_id)
  ) || [];

  // 3. Calcula o Placar Geral do Confronto (Baseado em TODOS os jogos)
  let myWins = 0;
  let opponentWins = 0;
  let ties = 0;

  commonGames.forEach(myG => {
    const opG = opponentGames?.find(g => g.game_id === myG.game_id);
    const myPct = Math.round((myG.unlocked_achievements / myG.total_achievements) * 100) || 0;
    const opPct = Math.round(((opG?.unlocked_achievements || 0) / (opG?.total_achievements || 1)) * 100) || 0;

    if (myPct === 100 && opPct === 100) {
      const myDate = new Date(myG.updated_at || myG.created_at).getTime();
      const opDate = new Date(opG?.updated_at || opG?.created_at || Date.now()).getTime();
      if (myDate < opDate) myWins++;
      else if (opDate < myDate) opponentWins++;
      else ties++;
    } else if (myPct > opPct) {
      myWins++;
    } else if (myPct < opPct) {
      opponentWins++;
    } else {
      ties++;
    }
  });

  // 4. Lógica de Paginação na Memória
  const totalItems = commonGames.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedGames = commonGames.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  const buildUrl = (pageNumber: number) => {
    const sp = new URLSearchParams();
    if (back) sp.set('back', back);
    sp.set('page', pageNumber.toString());
    return `/compare/${targetUsername}?${sp.toString()}`;
  };

  return (
    <div className="min-h-screen pb-20 animate-in fade-in duration-700 relative">
      
      <ClientBackButton href={backUrl} title="Voltar" />

      {/* BANNER DE ARENA */}
      <div className="-mx-4 md:-mx-8 -mt-4 md:-mt-8 h-48 md:h-64 relative overflow-hidden border-b border-white/5 shadow-2xl rounded-b-[3rem] bg-linear-to-b from-background to-surface/80 flex items-center justify-center">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 mix-blend-overlay"></div>
        <div className="absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-background to-transparent z-10" />
      </div>

      <div className="max-w-5xl mx-auto -mt-32 md:-mt-40 relative z-20 px-4 md:px-0 space-y-12">
        
        {/* HEADER DE CONFRONTO */}
        <div className="bg-surface/60 backdrop-blur-2xl border border-white/10 rounded-[3rem] p-8 md:p-12 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
          <div className="absolute -left-20 top-1/2 -translate-y-1/2 w-64 h-64 bg-primary/20 blur-[100px] rounded-full pointer-events-none"></div>
          <div className="absolute -right-20 top-1/2 -translate-y-1/2 w-64 h-64 bg-red-500/20 blur-[100px] rounded-full pointer-events-none"></div>

          {/* O SEU LADO */}
          <div className="text-center flex flex-col items-center z-10 w-full md:w-1/3">
            <div className="w-24 h-24 md:w-36 md:h-36 rounded-3xl border-4 md:border-[6px] border-primary overflow-hidden shadow-[0_0_30px_rgba(59,130,246,0.3)] relative">
              <Image src={me.avatar_url || ''} alt={me.username} fill className="object-cover" unoptimized />
            </div>
            <p className="font-black text-white text-2xl uppercase tracking-tighter mt-4 drop-shadow-md truncate max-w-full">VOCÊ</p>
            <div className="bg-primary/20 border border-primary/30 text-primary px-4 py-1.5 rounded-xl text-xs font-black tracking-widest mt-2">LVL {me.global_level}</div>
            <p className="text-4xl font-black text-white mt-4">{myWins} <span className="text-sm text-gray-500 font-bold uppercase tracking-widest block mt-1">Vitórias</span></p>
          </div>

          {/* O VS CENTRAL */}
          <div className="flex flex-col items-center justify-center z-10 w-full md:w-1/3 shrink-0 py-6 md:py-0 border-y md:border-y-0 md:border-x border-white/5">
            <GiCrossedSwords className="text-5xl md:text-7xl text-white/20 mb-2 drop-shadow-lg" />
            <h2 className="text-5xl md:text-6xl font-black text-white/90 italic tracking-tighter drop-shadow-xl">VS</h2>
            <div className="mt-4 text-center space-y-2">
              <span className="bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-xs font-black text-gray-400 tracking-widest uppercase block">
                {totalItems} Jogos em Comum
              </span>
              {ties > 0 && (
                <span className="bg-yellow-500/10 border border-yellow-500/20 px-3 py-1 rounded-lg text-[10px] font-black text-yellow-500 tracking-widest uppercase inline-block">
                  {ties} {ties === 1 ? 'Empate' : 'Empates'}
                </span>
              )}
            </div>
          </div>

          {/* O LADO DELE */}
          <div className="text-center flex flex-col items-center z-10 w-full md:w-1/3">
            <div className="w-24 h-24 md:w-36 md:h-36 rounded-3xl border-4 md:border-[6px] border-red-500 overflow-hidden shadow-[0_0_30px_rgba(239,68,68,0.3)] relative">
              <Image src={opponent.avatar_url || ''} alt={opponent.username} fill className="object-cover" unoptimized />
            </div>
            <p className="font-black text-white text-2xl uppercase tracking-tighter mt-4 drop-shadow-md truncate max-w-50">{opponent.username}</p>
            <div className="bg-red-500/20 border border-red-500/30 text-red-500 px-4 py-1.5 rounded-xl text-xs font-black tracking-widest mt-2">LVL {opponent.global_level}</div>
            <p className="text-4xl font-black text-white mt-4">{opponentWins} <span className="text-sm text-gray-500 font-bold uppercase tracking-widest block mt-1">Vitórias</span></p>
          </div>
        </div>

        {/* LISTA DE JOGOS EM COMUM */}
        <div className="space-y-6 pt-6">
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <FaGamepad className="text-primary text-3xl" /> Campos de Batalha
          </h2>

          {totalItems === 0 ? (
            <div className="bg-surface/30 border border-white/5 border-dashed rounded-3xl p-16 flex flex-col items-center justify-center text-center shadow-inner">
              <FaBed className="text-7xl text-white/20 mb-4" />
              <h3 className="text-xl font-black text-white mb-2">Sem Batalhas Ativas</h3>
              <p className="text-sm text-gray-500 max-w-md">Vocês ainda não jogaram os mesmos jogos. Desafie-o para uma nova jornada de caça aos troféus!</p>
            </div>
          ) : (
            <div className="space-y-10">
              <div className="grid grid-cols-1 gap-4">
                {paginatedGames.map(myG => {
                  const opG = opponentGames?.find(g => g.game_id === myG.game_id);
                  const myPct = Math.round((myG.unlocked_achievements / myG.total_achievements) * 100) || 0;
                  const opPct = Math.round(((opG?.unlocked_achievements || 0) / (opG?.total_achievements || 1)) * 100) || 0;

                  // LÓGICA COMPETITIVA DE VEREDITOS
                  let verdictNode;
                  
                  if (myPct === 0 && opPct === 0) {
                    verdictNode = (
                      <div className="flex flex-col items-center gap-1.5 text-gray-500 px-4 py-3 bg-surface/50 border border-white/5 rounded-xl min-w-35 text-center shadow-inner">
                        <FaBed className="text-2xl" />
                        <span className="font-black text-[10px] uppercase tracking-widest">Preguiçosos</span>
                      </div>
                    );
                  } else if (myPct === 100 && opPct === 100) {
                    const myDate = new Date(myG.updated_at || myG.created_at).getTime();
                    const opDate = new Date(opG?.updated_at || opG?.created_at || Date.now()).getTime();
                    
                    if (myDate < opDate) {
                      verdictNode = (
                        <div className="flex flex-col items-center gap-1.5 text-cyan-400 px-4 py-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl min-w-35 text-center shadow-[0_0_15px_rgba(34,211,238,0.2)]">
                          <FaCrown className="text-2xl" />
                          <span className="font-black text-[10px] uppercase tracking-widest">Platinou 1º!</span>
                        </div>
                      );
                    } else if (opDate < myDate) {
                      verdictNode = (
                        <div className="flex flex-col items-center gap-1.5 text-red-400 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl min-w-35 text-center">
                          <GiDeathSkull className="text-2xl" />
                          <span className="font-black text-[10px] uppercase tracking-widest">Ele Platinou 1º</span>
                        </div>
                      );
                    } else {
                      verdictNode = (
                        <div className="flex flex-col items-center gap-1.5 text-yellow-500 px-4 py-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl min-w-35 text-center">
                          <FaMedal className="text-2xl" />
                          <span className="font-black text-[10px] uppercase tracking-widest">Empate Divino</span>
                        </div>
                      );
                    }
                  } else if (myPct > opPct) {
                    verdictNode = (
                      <div className="flex flex-col items-center gap-1.5 text-green-500 px-4 py-3 bg-green-500/10 border border-green-500/30 rounded-xl min-w-35 text-center shadow-[0_0_15px_rgba(34,197,94,0.1)]">
                        <FaFire className="text-2xl animate-pulse" />
                        <span className="font-black text-[10px] uppercase tracking-widest">Amassando!</span>
                      </div>
                    );
                  } else if (myPct < opPct) {
                    verdictNode = (
                      <div className="flex flex-col items-center gap-1.5 text-orange-500 px-4 py-3 bg-orange-500/10 border border-orange-500/30 rounded-xl min-w-35 text-center">
                        <GiDeathSkull className="text-2xl" />
                        <span className="font-black text-[10px] uppercase tracking-widest">Comendo Poeira</span>
                      </div>
                    );
                  } else {
                    verdictNode = (
                      <div className="flex flex-col items-center gap-1.5 text-blue-400 px-4 py-3 bg-blue-500/10 border border-blue-500/30 rounded-xl min-w-35 text-center">
                        <GiCrossedSwords className="text-2xl" />
                        <span className="font-black text-[10px] uppercase tracking-widest">Acirrado</span>
                      </div>
                    );
                  }

                  return (
                    <div key={myG.game_id} className="bg-surface/60 backdrop-blur-md border border-white/5 rounded-4xl p-4 md:p-6 flex flex-col lg:flex-row items-center gap-6 group hover:border-white/10 transition-all shadow-lg hover:shadow-xl">
                      
                      {/* Capa do Jogo */}
                      <div className="w-24 h-36 relative rounded-[1.25rem] overflow-hidden shadow-2xl shrink-0 border border-white/5 group-hover:scale-105 transition-transform duration-500">
                        <GameCardImage src={myG.games.cover_url} title={myG.games.title} />
                      </div>
                      
                      <div className="flex-1 w-full flex flex-col justify-center space-y-5">
                        <h3 className="font-black text-white text-lg lg:text-xl text-center lg:text-left drop-shadow-md">{myG.games.title}</h3>
                        
                        <div className="flex flex-col md:flex-row items-center gap-6 w-full bg-background/50 p-4 rounded-2xl border border-white/5 shadow-inner">
                          
                          {/* Teu Progresso */}
                          <div className="flex-1 w-full space-y-2 text-right">
                            <p className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center justify-end gap-1.5">VOCÊ <Image src={me.avatar_url || ''} alt="" width={16} height={16} className="rounded-full inline" unoptimized/></p>
                            <div className="h-2.5 bg-surface rounded-full overflow-hidden border border-white/5 shadow-inner">
                              <div className="h-full bg-linear-to-r from-blue-600 to-cyan-400 transition-all duration-1000 ease-out" style={{ width: `${myPct}%` }} />
                            </div>
                            <p className="text-xs font-black text-gray-300">{myG.unlocked_achievements} / {myG.total_achievements} <span className="text-cyan-400 ml-1">({myPct}%)</span></p>
                          </div>

                          {/* Divisor */}
                          <div className="w-px h-12 bg-white/10 hidden md:block" />
                          <div className="h-px w-full bg-white/10 md:hidden" />

                          {/* Progresso dele */}
                          <div className="flex-1 w-full space-y-2 text-left">
                            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest flex items-center justify-start gap-1.5"><Image src={opponent.avatar_url || ''} alt="" width={16} height={16} className="rounded-full inline border border-red-500" unoptimized/> {opponent.username}</p>
                            <div className="h-2.5 bg-surface rounded-full overflow-hidden border border-white/5 shadow-inner flex justify-start">
                              <div className="h-full bg-linear-to-r from-red-600 to-orange-400 transition-all duration-1000 ease-out" style={{ width: `${opPct}%` }} />
                            </div>
                            <p className="text-xs font-black text-gray-300">{opG?.unlocked_achievements || 0} / {opG?.total_achievements || myG.total_achievements} <span className="text-orange-400 ml-1">({opPct}%)</span></p>
                          </div>

                        </div>
                      </div>

                      {/* Veredito Visual */}
                      <div className="shrink-0 flex items-center justify-center pt-2 lg:pt-0 w-full lg:w-auto">
                        {verdictNode}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* CONTROLES DE PAGINAÇÃO */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-white/5 pt-8">
                  <Link href={hasPrevPage ? buildUrl(currentPage - 1) : '#'} className={`px-6 py-3 rounded-xl font-black text-sm transition-all ${hasPrevPage ? 'bg-surface border border-white/10 text-white hover:bg-primary hover:border-primary' : 'bg-surface/50 text-gray-600 cursor-not-allowed pointer-events-none'}`}>
                    <FaArrowLeft className="mr-2 inline" /> Anterior
                  </Link>
                  <span className="text-gray-400 font-bold text-sm">
                    Página <span className="text-white">{currentPage}</span> de {totalPages}
                  </span>
                  <Link href={hasNextPage ? buildUrl(currentPage + 1) : '#'} className={`px-6 py-3 rounded-xl font-black text-sm transition-all ${hasNextPage ? 'bg-surface border border-white/10 text-white hover:bg-primary hover:border-primary' : 'bg-surface/50 text-gray-600 cursor-not-allowed pointer-events-none'}`}>
                    Próxima <FaArrowRight className="ml-2 inline" />
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}