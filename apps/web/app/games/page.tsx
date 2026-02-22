import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import GameSearch from "./GameSearch";
import GameCardImage from "../components/GameCardImage";
import { FaSteam } from "react-icons/fa";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Biblioteca de Jogos | Nexus Achievements",
  description: "Explore a biblioteca de jogos do Nexus Achievements, onde você pode encontrar uma vasta coleção de títulos jogados pela comunidade. Descubra novos jogos, veja detalhes sobre conquistas e mergulhe no universo dos games com o apoio da comunidade.",
}

interface GamesLibraryProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function GamesLibraryPage({ searchParams }: GamesLibraryProps) {
  const { q: searchQuery } = await searchParams;
  const supabase = await createClient();

  // Constrói a consulta baseada em haver ou não pesquisa
  let query = supabase
    .from('games')
    .select('id, title, cover_url, total_achievements');

  if (searchQuery) {
    query = query.ilike('title', `%${searchQuery}%`); // Busca insensível a maiúsculas/minúsculas
  }

  // Ordena por nome e limita a 60 jogos por página para não pesar
  query = query.order('title').limit(60);

  const { data: games, error } = await query;

  if (error) {
    console.error("Erro ao buscar jogos:", error);
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">

      {/* Cabeçalho da Biblioteca */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-8 border-b border-border/50 pb-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-md flex items-center gap-3">
            <span>🎮</span> Biblioteca
          </h1>
          <p className="text-gray-400 mt-2">
            Catálogo de jogos explorados pela comunidade do Nexus.
          </p>
        </div>

        {/* Barra de Pesquisa */}
        <GameSearch />
      </div>

      {/* Lista de Jogos */}
      {games && games.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
          {games.map((game) => {
            return (
              <Link
                href={`/games/${game.id}`}
                key={game.id}
                className="group relative aspect-3/4 rounded-2xl bg-surface border border-border/50 overflow-hidden shadow-lg hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:border-primary/50 transition-all duration-300 flex flex-col"
              >
                {/* Capa Inteligente do Jogo */}
                <div className="absolute inset-0 z-0">
                  <GameCardImage src={game.cover_url} title={game.title} />
                </div>

                {/* Overlay Escuro Inferior */}
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-black/90 via-black/40 to-transparent z-10"></div>

                {/* Informações */}
                <div className="absolute inset-x-0 bottom-0 p-3 md:p-4 z-20 flex flex-col justify-end">
                  <h3 className="font-bold text-white text-xs md:text-sm line-clamp-2 drop-shadow-md leading-tight group-hover:text-primary transition-colors">
                    {game.cover_url ? (game.title) : (
                      <span className="flex items-center gap-1">
                        <FaSteam className="text-gray-400" /> {game.title}
                      </span>
                    )}
                  </h3>
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="bg-background/80 backdrop-blur-sm border border-border/50 px-2 py-0.5 rounded text-[10px] font-bold text-gray-300">
                      🏆 {game.total_achievements}
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="py-20 text-center flex flex-col items-center justify-center opacity-50 bg-surface/20 rounded-3xl border border-dashed border-border">
          <span className="text-6xl mb-4">👻</span>
          <h3 className="text-xl font-bold text-white">Nenhum jogo encontrado</h3>
          <p className="text-sm mt-2 text-gray-400">
            {searchQuery
              ? `Não encontrámos nenhum jogo com o nome "${searchQuery}".`
              : "A biblioteca está vazia. Sincronize o seu perfil para adicionar jogos!"}
          </p>
        </div>
      )}

    </div>
  );
}