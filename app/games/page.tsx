import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import GameSearch from "./GameSearch";
import { FaSteam, FaPlaystation, FaXbox, FaArrowRight, FaArrowLeft, FaGamepad, FaTrophy, FaGhost } from "react-icons/fa";
import { SiEpicgames } from "react-icons/si";
import { Metadata } from "next";
import FlipGameCard from "../components/FlipGameCard"; // NOVO IMPORT

export const metadata: Metadata = {
  title: "Biblioteca de Jogos | Nexus Achievements",
  description: "Explore a biblioteca de jogos do Nexus Achievements filtrando por plataformas e categorias.",
}

interface GamesLibraryProps {
  searchParams: Promise<{ q?: string; page?: string; sort?: string; platform?: string; category?: string }>;
}

const PLATFORMS = [
  { id: 'Steam', icon: <FaSteam />, label: 'Steam' },
  { id: 'PlayStation', icon: <FaPlaystation />, label: 'PlayStation' },
  { id: 'Xbox', icon: <FaXbox />, label: 'Xbox' },
  { id: 'Epic Games', icon: <SiEpicgames />, label: 'Epic' },
];

export default async function GamesLibraryPage({ searchParams }: GamesLibraryProps) {
  const params = await searchParams;
  const searchQuery = params.q || '';
  const currentPage = Number(params.page) || 1;
  const sortBy = params.sort || 'name';
  const currentPlatform = params.platform || 'Steam';
  const currentCategory = params.category || '';

  const ITEMS_PER_PAGE = 30;
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser(); // 🔥 ADICIONADO PARA PROGRESSO

  // ====================================================================
  // 🎯 BUSCA DINÂMICA DE CATEGORIAS
  // ====================================================================
  const { data: catData } = await supabase
    .from('games')
    .select('categories')
    .eq('platform', currentPlatform)
    .not('categories', 'is', null);

  const uniqueCategories = Array.from(
    new Set(catData?.flatMap(item => item.categories || []) || [])
  ).sort();

  // ====================================================================
  // 🔎 CONSTRUÇÃO DA QUERY PRINCIPAL DOS JOGOS
  // ====================================================================
  let query = supabase
    .from('games')
    .select('id, title, cover_url, total_achievements', { count: 'exact' })
    .eq('platform', currentPlatform);

  if (searchQuery) query = query.ilike('title', `%${searchQuery}%`);

  if (currentCategory) {
    query = query.contains('categories', [currentCategory]);
  }

  if (sortBy === 'achievements') query = query.order('total_achievements', { ascending: false });
  else query = query.order('title', { ascending: true });

  query = query.range(offset, offset + ITEMS_PER_PAGE - 1);

  const { data: games, count } = await query;

  const totalItems = count || 0;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  // 🔥 ====================================================================
  // BUSCA O PROGRESSO DO UTILIZADOR PARA AS CARTAS DE POKER 3D
  // ====================================================================
  const userProgressMap: Record<string, { unlocked: number, is_platinum: boolean, playtime_minutes: number }> = {};
  if (user && games && games.length > 0) {
    const gameIds = games.map(g => g.id);
    const { data: progressData } = await supabase
      .from('user_games')
      .select('game_id, unlocked_achievements, is_platinum, playtime_minutes') // playtime_minutes ADICIONADO AQUI
      .eq('user_id', user.id)
      .in('game_id', gameIds);

    progressData?.forEach(p => {
      userProgressMap[p.game_id] = {
        unlocked: p.unlocked_achievements,
        is_platinum: p.is_platinum,
        playtime_minutes: p.playtime_minutes // PASSANDO O DADO PARA A CARTA
      };
    });
  }

  // ====================================================================
  // 🛠️ HELPER PARA MANTER A MEMÓRIA DA URL NAS NAVEGAÇÕES
  // ====================================================================
  const buildUrl = (updates: Record<string, string | null>) => {
    const sp = new URLSearchParams();
    if (searchQuery) sp.set('q', searchQuery);
    if (sortBy !== 'name') sp.set('sort', sortBy);
    if (currentPlatform !== 'Steam') sp.set('platform', currentPlatform);
    if (currentCategory) sp.set('category', currentCategory);
    if (currentPage !== 1) sp.set('page', currentPage.toString());

    Object.entries(updates).forEach(([key, val]) => {
      if (val === null) sp.delete(key);
      else sp.set(key, val);
    });
    return `/games?${sp.toString()}`;
  };

  const currentFullUrl = buildUrl({});

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10 px-2 md:px-0">
      {/* CABEÇALHO */}
      <div className="pt-6 md:pt-8 pb-6 border-b border-white/5">
        <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight drop-shadow-md flex items-center gap-3">
          <FaGamepad className="text-primary text-4xl md:text-5xl" /> Biblioteca
        </h1>
        <p className="text-gray-400 mt-2 text-sm md:text-base">
          O catálogo completo do Nexus. Mostrando <strong className="text-primary">{totalItems}</strong> jogos.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8 items-start">
        <aside className="lg:col-span-1 space-y-4 md:space-y-6 lg:sticky lg:top-8">
          <div className="bg-surface/30 p-4 md:p-5 rounded-2xl md:rounded-3xl border border-white/5 shadow-inner">
            <h3 className="text-xs md:text-sm font-black text-gray-400 uppercase tracking-widest mb-3 md:mb-4">Pesquisa</h3>
            <GameSearch />
          </div>

          <div className="bg-surface/30 p-4 md:p-5 rounded-2xl md:rounded-3xl border border-white/5 shadow-inner">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <h3 className="text-xs md:text-sm font-black text-gray-400 uppercase tracking-widest">Plataforma</h3>
            </div>
            <div className="space-y-2">
              {PLATFORMS.map((plat) => (
                <Link
                  key={plat.id}
                  href={`/games?platform=${plat.id}`}
                  className={`flex items-center gap-3 px-4 py-2.5 md:py-3 rounded-xl font-bold text-sm transition-all ${currentPlatform === plat.id
                    ? 'bg-primary/20 border border-primary/50 text-primary shadow-inner'
                    : 'bg-background/50 border border-transparent text-gray-400 hover:text-white hover:bg-white/5'
                    }`}
                >
                  <span className="text-lg">{plat.icon}</span>
                  {plat.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="bg-surface/30 p-4 md:p-5 rounded-2xl md:rounded-3xl border border-white/5 shadow-inner">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <h3 className="text-xs md:text-sm font-black text-gray-400 uppercase tracking-widest">Ordenar Por</h3>
            </div>
            <div className="flex flex-col gap-2">
              <Link href={buildUrl({ sort: 'name', page: '1' })} className={`px-4 py-2.5 md:py-3 rounded-xl font-bold text-sm transition-all ${sortBy === 'name' ? 'bg-primary/20 border border-primary/50 text-primary shadow-inner' : 'bg-background/50 border border-transparent text-gray-400 hover:text-white hover:bg-white/5'}`}>
                A-Z (Ordem Alfabética)
              </Link>
              <Link href={buildUrl({ sort: 'achievements', page: '1' })} className={`px-4 py-2.5 md:py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${sortBy === 'achievements' ? 'bg-primary/20 border border-primary/50 text-primary shadow-inner' : 'bg-background/50 border border-transparent text-gray-400 hover:text-white hover:bg-white/5'}`}>
                <FaTrophy className={sortBy === 'achievements' ? 'text-primary' : 'text-gray-500'} /> Mais Conquistas
              </Link>
            </div>
          </div>

          {uniqueCategories.length > 0 && (
            <div className="bg-surface/30 p-4 md:p-5 rounded-2xl md:rounded-3xl border border-white/5 shadow-inner">
              <div className="flex items-center justify-between mb-3 md:mb-4">
                <h3 className="text-xs md:text-sm font-black text-gray-400 uppercase tracking-widest">Gêneros</h3>
                {currentCategory && (
                  <Link href={buildUrl({ category: null, page: '1' })} className="text-[10px] bg-red-500/20 text-red-400 px-2 py-1 rounded border border-red-500/30 hover:bg-red-500/30 transition-colors uppercase font-bold">
                    Limpar
                  </Link>
                )}
              </div>

              <div className="flex flex-wrap gap-2 max-h-48 md:max-h-64 overflow-y-auto custom-scrollbar pr-2">
                <Link
                  href={buildUrl({ category: null, page: '1' })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${!currentCategory ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'border-transparent bg-background/50 text-gray-500 hover:bg-white/10 hover:text-white'}`}
                >
                  Todos
                </Link>

                {uniqueCategories.map((cat) => (
                  <Link
                    key={cat}
                    href={buildUrl({ category: cat, page: '1' })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${currentCategory === cat
                      ? 'bg-blue-500/20 border-blue-500/50 text-blue-400 shadow-inner'
                      : 'border-white/5 bg-background/50 text-gray-400 hover:bg-white/10 hover:text-white'
                      }`}
                  >
                    {cat}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>

        <main className="lg:col-span-3">
          {games && games.length > 0 ? (
            <div className="space-y-6 md:space-y-10">
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4 md:pb-8 md:mb-8 gap-2">
                  <Link href={hasPrevPage ? buildUrl({ page: (currentPage - 1).toString() }) : '#'} className={`flex items-center justify-center gap-2 px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl font-black text-xs sm:text-sm transition-all ${hasPrevPage ? 'bg-surface border border-white/10 text-white hover:bg-primary hover:border-primary' : 'bg-surface/50 text-gray-600 cursor-not-allowed pointer-events-none'}`}>
                    <FaArrowLeft /> <span className="hidden sm:inline">Anterior</span>
                  </Link>
                  <span className="text-gray-400 font-bold text-xs sm:text-sm px-3 py-2 sm:px-4 sm:py-2.5 bg-surface/50 border border-white/10 rounded-xl uppercase text-center shrink-0">
                    <span className="hidden sm:inline">Página </span>{currentPage} <span className="hidden sm:inline">de {totalPages}</span>
                    <span className="sm:hidden">/ {totalPages}</span>
                  </span>
                  <Link href={hasNextPage ? buildUrl({ page: (currentPage + 1).toString() }) : '#'} className={`flex items-center justify-center gap-2 px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl font-black text-xs sm:text-sm transition-all ${hasNextPage ? 'bg-surface border border-white/10 text-white hover:bg-primary hover:border-primary' : 'bg-surface/50 text-gray-600 cursor-not-allowed pointer-events-none'}`}>
                    <span className="hidden sm:inline">Próxima</span> <FaArrowRight />
                  </Link>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-6">
                {games.map((game) => (
                  <FlipGameCard
                    key={game.id}
                    game={game}
                    progress={userProgressMap[game.id] || null}
                    backUrl={currentFullUrl}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-white/5 pt-6 mt-6 md:pt-8 md:mt-8 pb-6 mb-6 md:pb-0 md:mb-0 gap-2">
                  <Link href={hasPrevPage ? buildUrl({ page: (currentPage - 1).toString() }) : '#'} className={`flex items-center justify-center gap-2 px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl font-black text-xs sm:text-sm transition-all ${hasPrevPage ? 'bg-surface border border-white/10 text-white hover:bg-primary hover:border-primary' : 'bg-surface/50 text-gray-600 cursor-not-allowed pointer-events-none'}`}>
                    <FaArrowLeft /> <span className="hidden sm:inline">Anterior</span>
                  </Link>
                  <span className="text-gray-400 font-bold text-xs sm:text-sm px-3 py-2 sm:px-4 sm:py-2.5 bg-surface/50 border border-white/10 rounded-xl uppercase text-center shrink-0">
                    <span className="hidden sm:inline">Página </span>{currentPage} <span className="hidden sm:inline">de {totalPages}</span>
                    <span className="sm:hidden">/ {totalPages}</span>
                  </span>
                  <Link href={hasNextPage ? buildUrl({ page: (currentPage + 1).toString() }) : '#'} className={`flex items-center justify-center gap-2 px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl font-black text-xs sm:text-sm transition-all ${hasNextPage ? 'bg-surface border border-white/10 text-white hover:bg-primary hover:border-primary' : 'bg-surface/50 text-gray-600 cursor-not-allowed pointer-events-none'}`}>
                    <span className="hidden sm:inline">Próxima</span> <FaArrowRight />
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="py-20 md:py-32 text-center flex flex-col items-center justify-center bg-surface/20 rounded-3xl md:rounded-[3rem] border border-dashed border-white/10 shadow-inner h-full min-h-75 md:min-h-125">
              <FaGhost className="text-5xl md:text-7xl mb-4 md:mb-6 text-white/10 drop-shadow-md" />
              <h3 className="text-xl md:text-2xl font-black text-white tracking-tight">Nenhum jogo encontrado</h3>
              <p className="text-xs md:text-sm mt-2 md:mt-3 text-gray-400 max-w-xs md:max-w-md font-medium leading-relaxed px-4">
                Nenhum resultado corresponde aos filtros selecionados.
              </p>
              <Link href="/games" className="mt-6 px-5 md:px-6 py-2.5 md:py-3 bg-surface border border-white/10 text-white font-bold text-sm rounded-xl hover:bg-white/5 transition-all">
                Limpar Todos os Filtros
              </Link>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}