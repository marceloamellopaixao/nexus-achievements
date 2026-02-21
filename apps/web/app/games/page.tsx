import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import Image from "next/image";
import GameSearch from "./GameSearch";

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
            const hasCover = typeof game.cover_url === 'string' && game.cover_url.trim() !== '';

            return (
              <Link 
                href={`/games/${game.id}`} 
                key={game.id} 
                className="group relative aspect-3/4 rounded-2xl bg-surface border border-border/50 overflow-hidden shadow-lg hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:border-primary/50 transition-all duration-300 flex flex-col"
              >
                {/* Capa do Jogo */}
                <div className="absolute inset-0 z-0">
                  {hasCover ? (
                    <Image 
                      src={game.cover_url} 
                      alt={game.title} 
                      fill 
                      className="object-cover group-hover:scale-105 transition-transform duration-500" 
                      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 16vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-surface text-4xl opacity-20">🎮</div>
                  )}
                </div>

                {/* Overlay Escuro Inferior para garantir leitura do texto */}
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-black/90 via-black/40 to-transparent z-10"></div>

                {/* Informações (Título e Conquistas) */}
                <div className="absolute inset-x-0 bottom-0 p-3 md:p-4 z-20 flex flex-col justify-end">
                  <h3 className="font-bold text-white text-xs md:text-sm line-clamp-2 drop-shadow-md leading-tight group-hover:text-primary transition-colors">
                    {game.title}
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