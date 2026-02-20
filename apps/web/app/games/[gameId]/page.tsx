import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import Image from "next/image";

interface GamePageProps {
  params: Promise<{ gameId: string }>;
}

export default async function GamePage(props: GamePageProps) {
  // Desembrulha os params (Padrão Next.js 15)
  const { gameId } = await props.params;
  const supabase = await createClient();

  // 1. Busca os metadados do jogo
  const { data: game, error } = await supabase
    .from("games")
    .select("*")
    .eq("id", gameId)
    .single();

  if (error || !game) notFound();

  // 2. Mock de estatísticas
  const communityStats = {
    totalPlayers: 1420,
    totalPlatinums: 315,
    completionRate: "22%"
  };

  // VALIDAÇÃO RIGOROSA PARA O NEXT/IMAGE
  const hasBanner = typeof game.banner_url === 'string' && game.banner_url.trim() !== '';
  const hasCover = typeof game.cover_url === 'string' && game.cover_url.trim() !== '';

  return (
    <div className="min-h-screen pb-20 animate-in fade-in duration-500">
      
      {/* HEADER / BANNER DO JOGO */}
      <div className="h-72 md:h-96 w-full bg-surface relative overflow-hidden rounded-b-3xl border-b border-border shadow-2xl">
        {hasBanner ? (
          <Image 
            src={game.banner_url} 
            alt={game.title} 
            fill 
            className="object-cover opacity-40 mix-blend-luminosity" 
            priority 
          />
        ) : (
          <div className="absolute inset-0 bg-linear-to-r from-blue-900 to-black opacity-50"></div>
        )}
        <div className="absolute inset-0 bg-linear-to-t from-background via-background/80 to-transparent" />
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-32 relative z-10">
        <div className="flex flex-col md:flex-row gap-8 items-start md:items-end">
          
          {/* CAPA DO JOGO */}
          <div className="w-48 aspect-3/4 rounded-2xl border-4 border-background bg-surface overflow-hidden shadow-2xl relative shrink-0">
            {hasCover ? (
              <Image 
                src={game.cover_url} 
                alt={game.title} 
                fill 
                className="object-cover" 
                priority 
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-5xl font-bold bg-primary/20 text-primary">
                🎮
              </div>
            )}
          </div>

          {/* INFORMAÇÕES DO JOGO */}
          <div className="flex-1 pb-4">
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-lg">
              {game.title}
            </h1>
            <p className="text-primary font-bold tracking-widest uppercase text-sm mt-2">
              {game.developer || "Desenvolvedor Desconhecido"}
            </p>
            
            <div className="flex items-center gap-4 mt-6">
              <span className="bg-surface/80 backdrop-blur-md border border-border px-4 py-2 rounded-xl text-sm font-bold text-white shadow-sm">
                🏆 {game.total_achievements} Conquistas
              </span>
              <button className="px-6 py-2 bg-white text-black font-black rounded-xl hover:bg-gray-200 transition-all shadow-lg hover:scale-105 active:scale-95">
                + Adicionar à Coleção
              </button>
            </div>
          </div>
        </div>

        {/* ESTATÍSTICAS DA COMUNIDADE */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <div className="bg-surface/50 border border-border p-6 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center text-2xl">👥</div>
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Jogadores no Nexus</p>
              <p className="text-2xl font-black text-white">{communityStats.totalPlayers}</p>
            </div>
          </div>
          <div className="bg-surface/50 border border-border p-6 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-500/10 text-purple-400 rounded-full flex items-center justify-center text-2xl">👑</div>
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Platinas Conquistadas</p>
              <p className="text-2xl font-black text-white">{communityStats.totalPlatinums}</p>
            </div>
          </div>
          <div className="bg-surface/50 border border-border p-6 rounded-2xl flex items-center gap-4">
            <div className="w-12 h-12 bg-green-500/10 text-green-400 rounded-full flex items-center justify-center text-2xl">📈</div>
            <div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Taxa de Platina</p>
              <p className="text-2xl font-black text-white">{communityStats.completionRate}</p>
            </div>
          </div>
        </div>

        {/* RANKING DO JOGO */}
        <div className="mt-12 space-y-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            🥇 Primeiros a Platinar
          </h2>
          <div className="bg-surface/30 border border-border border-dashed rounded-2xl p-10 text-center text-gray-500">
            O ranking de platinas deste jogo estará disponível assim que sincronizarmos as conquistas detalhadas da Steam.
          </div>
        </div>

      </div>
    </div>
  );
}