import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import GameCardImage from "@/app/components/GameCardImage";

interface ComparePageProps {
  params: Promise<{ username: string }>;
}

export default async function ComparePage({ params }: ComparePageProps) {
  const { username: targetUsername } = await params;
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) return notFound();

  // 1. Busca os dois perfis
  const { data: me } = await supabase.from("users").select("*").eq("id", authUser.id).single();
  const { data: opponent } = await supabase.from("users").select("*").eq("username", targetUsername).single();

  if (!opponent || !me) return notFound();

  // 2. Busca jogos de ambos para encontrar o "Match"
  const [{ data: myGames }, { data: opponentGames }] = await Promise.all([
    supabase.from("user_games").select("*, games(*)").eq("user_id", me.id),
    supabase.from("user_games").select("*, games(*)").eq("user_id", opponent.id)
  ]);

  const commonGames = myGames?.filter(myG => 
    opponentGames?.some(opG => opG.game_id === myG.game_id)
  ) || [];

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 space-y-12 animate-in fade-in duration-700">
      
      {/* HEADER DE CONFRONTO */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-16">
        <div className="text-center space-y-3">
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl border-4 border-primary overflow-hidden shadow-2xl mx-auto">
            <Image src={me.avatar_url || ''} alt={me.username} width={128} height={128} className="object-cover" unoptimized />
          </div>
          <p className="font-black text-white text-xl uppercase tracking-tighter">Eu</p>
          <div className="bg-primary/20 text-primary px-3 py-1 rounded-lg text-xs font-black">LVL {me.global_level}</div>
        </div>

        <div className="text-6xl md:text-8xl font-black text-border opacity-20 select-none">VS</div>

        <div className="text-center space-y-3">
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl border-4 border-red-500 overflow-hidden shadow-2xl mx-auto">
            <Image src={opponent.avatar_url || ''} alt={opponent.username} width={128} height={128} className="object-cover" unoptimized />
          </div>
          <p className="font-black text-white text-xl uppercase tracking-tighter">{opponent.username}</p>
          <div className="bg-red-500/20 text-red-500 px-3 py-1 rounded-lg text-xs font-black">LVL {opponent.global_level}</div>
        </div>
      </div>

      {/* LISTA DE JOGOS EM COMUM */}
      <div className="space-y-6">
        <h2 className="text-2xl font-black text-white flex items-center gap-3">
          <span className="text-3xl">⚔️</span> Campos de Batalha em Comum
        </h2>

        {commonGames.length === 0 ? (
          <div className="bg-surface/30 border border-border border-dashed rounded-3xl p-16 text-center text-gray-500 font-bold">
            Vocês ainda não jogaram os mesmos jogos. Que tal sugerir um desafio?
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {commonGames.map(myG => {
              const opG = opponentGames?.find(g => g.game_id === myG.game_id);
              const myPct = Math.round((myG.unlocked_achievements / myG.total_achievements) * 100) || 0;
              const opPct = Math.round((opG?.unlocked_achievements / opG?.total_achievements) * 100) || 0;

              return (
                <div key={myG.game_id} className="bg-surface/40 backdrop-blur-md border border-border rounded-2xl p-4 md:p-6 flex flex-col md:flex-row items-center gap-6 group hover:border-primary/30 transition-all">
                  <div className="w-20 h-28 relative rounded-xl overflow-hidden shadow-lg shrink-0">
                    <GameCardImage src={myG.games.cover_url} title={myG.games.title} />
                  </div>
                  
                  <div className="flex-1 w-full space-y-4">
                    <h3 className="font-black text-white text-lg text-center md:text-left">{myG.games.title}</h3>
                    
                    <div className="flex items-center gap-4">
                      {/* Teu Progresso */}
                      <div className="flex-1 space-y-1 text-right">
                        <p className="text-[10px] font-black text-primary uppercase">EU</p>
                        <div className="h-2 bg-background rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${myPct}%` }} />
                        </div>
                        <p className="text-xs font-bold text-gray-400">{myPct}%</p>
                      </div>

                      <div className="w-px h-10 bg-border hidden md:block" />

                      {/* Progresso dele */}
                      <div className="flex-1 space-y-1 text-left">
                        <p className="text-[10px] font-black text-red-500 uppercase">{opponent.username}</p>
                        <div className="h-2 bg-background rounded-full overflow-hidden">
                          <div className="h-full bg-red-500" style={{ width: `${opPct}%` }} />
                        </div>
                        <p className="text-xs font-bold text-gray-400">{opPct}%</p>
                      </div>
                    </div>
                  </div>

                  {/* Veredito Visual */}
                  <div className="shrink-0 flex items-center justify-center">
                    {myPct > opPct ? (
                      <div className="bg-green-500/10 text-green-500 px-4 py-2 rounded-xl border border-green-500/20 font-black text-xs animate-pulse">BOAA TÁ GANHANDO! 🚀</div>
                    ) : myPct < opPct ? (
                      <div className="bg-orange-500/10 text-orange-500 px-4 py-2 rounded-xl border border-orange-500/20 font-black text-xs">IIH TÁ PERDENDO 💀</div>
                    ) : (
                      <div className="bg-blue-500/10 text-blue-500 px-4 py-2 rounded-xl border border-blue-500/20 font-black text-xs">EMPATE QUE PENA! 🤝</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}