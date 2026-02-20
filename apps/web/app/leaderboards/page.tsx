import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import GameFilter from "./GameFilter";

interface LeaderboardsPageProps {
  searchParams: Promise<{ sort?: string, gameId?: string }>;
}

export default async function LeaderboardsPage({ searchParams }: LeaderboardsPageProps) {
  const { sort, gameId } = await searchParams;
  const activeSort = sort === 'level' ? 'global_level' : sort === 'coins' ? 'nexus_coins' : 'total_platinums';

  const supabase = await createClient();

  // 1. Busca todos os jogos disponíveis para popular o Filtro (Dropdown)
  const { data: availableGames } = await supabase
    .from('games')
    .select('id, title')
    .order('title');

  let users: any[] = [];
  let gameTitle = "";

  // 2. LÓGICA DE BUSCA
  if (gameId) {
    // RANKING ESPECÍFICO DE UM JOGO
    const selectedGame = availableGames?.find(g => g.id === gameId);
    if (selectedGame) gameTitle = selectedGame.title;

    // Busca quem jogou e ordena: 1º Platinas, 2º Qtd Conquistas, 3º Data mais antiga (primeiro a platinar)
    const { data: topInGame } = await supabase
      .from('user_games')
      .select('unlocked_achievements, is_platinum, last_synced_at, users(id, username, avatar_url, title)')
      .eq('game_id', gameId)
      .order('is_platinum', { ascending: false })
      .order('unlocked_achievements', { ascending: false })
      .order('last_synced_at', { ascending: true })
      .limit(50);

    // Mapeia os dados para bater certo com a interface
    users = topInGame?.filter(record => record.users).map(record => ({
      id: record.users?.id,
      username: record.users?.username,
      avatar_url: record.users?.avatar_url,
      title: record.users?.title,
      // Usamos um campo fake para mostrar as conquistas em vez do nível global
      game_stat: record.is_platinum ? '🏆 Platinado' : `${record.unlocked_achievements} Conquistas`,
      is_platinum: record.is_platinum
    })) || [];

  } else {
    // RANKING GLOBAL
    const { data: topUsers } = await supabase
      .from('users')
      .select('id, username, avatar_url, global_level, total_platinums, nexus_coins, title')
      .order(activeSort, { ascending: false })
      .limit(50);

    users = topUsers || [];
  }

  // 3. ORGANIZAÇÃO DO PÓDIO SEGURO (Impede crashes se houver < 3 jogadores)
  const podium = [
    users.length > 1 ? users[1] : null, // Prata (Esquerda)
    users.length > 0 ? users[0] : null, // Ouro (Centro)
    users.length > 2 ? users[2] : null  // Bronze (Direita)
  ];
  const restOfLeaderboard = users.length > 3 ? users.slice(3) : [];

  // 4. FUNÇÕES DE DISPLAY
  const getStatValue = (user: any) => {
    if (gameId) return user.game_stat; // Se estiver num jogo, mostra as conquistas do jogo
    if (activeSort === 'global_level') return `Lvl ${user.global_level || 1}`;
    if (activeSort === 'nexus_coins') return `🪙 ${user.nexus_coins || 0}`;
    return `🏆 ${user.total_platinums || 0}`;
  };

  const getStatLabel = () => {
    if (gameId) return "Progresso";
    if (activeSort === 'global_level') return "Nível Global";
    if (activeSort === 'nexus_coins') return "Nexus Coins";
    return "Platinas Totais";
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto pb-20">

      {/* CABEÇALHO E FILTROS */}
      <div className="text-center space-y-4 pt-8 pb-4">
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-md">
          {gameId ? `Ranking: ${gameTitle}` : "🏆 Hall da Fama"}
        </h1>
        <p className="text-gray-400">
          {gameId ? "Os caçadores mais letais deste jogo." : "Os maiores caçadores de conquistas do Nexus."}
        </p>

        <div className="flex flex-col items-center justify-center gap-6 mt-8 w-full">
          {/* O Nosso Novo Motor de Pesquisa */}
          <div className="w-full">
            <GameFilter games={availableGames || []} />
          </div>

          {/* Filtros Globais (escondem-se se estiver a ver um jogo específico) */}
          {!gameId && (
            <div className="flex flex-wrap justify-center gap-2 mt-2">
              <Link href="/leaderboards?sort=platinums" className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md ${activeSort === 'total_platinums' ? 'bg-primary text-white scale-105' : 'bg-surface border border-border text-gray-400 hover:text-white hover:border-primary/50'}`}>
                🏆 Platinas
              </Link>
              <Link href="/leaderboards?sort=level" className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md ${activeSort === 'global_level' ? 'bg-purple-600 text-white scale-105' : 'bg-surface border border-border text-gray-400 hover:text-white hover:border-purple-500/50'}`}>
                ⭐ Maior Nível
              </Link>
              <Link href="/leaderboards?sort=coins" className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md ${activeSort === 'nexus_coins' ? 'bg-yellow-600 text-white scale-105' : 'bg-surface border border-border text-gray-400 hover:text-white hover:border-yellow-500/50'}`}>
                🪙 Mais Ricos
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* O PÓDIO (TOP 3) */}
      {users.length > 0 && (
        <div className="flex items-end justify-center gap-2 md:gap-6 mt-16 mb-16 h-64 md:h-80">
          {podium.map((user, index) => {
            if (!user) return <div key={`empty-${index}`} className="w-24 md:w-48" />;

            const rank = index === 0 ? 2 : index === 1 ? 1 : 3;
            const isGold = rank === 1;
            const isSilver = rank === 2;
            const isBronze = rank === 3;

            const heightClass = isGold ? 'h-48 md:h-64' : isSilver ? 'h-40 md:h-52' : 'h-32 md:h-44';
            const colorClass = isGold
              ? 'bg-linear-to-t from-yellow-900/40 to-yellow-500/10 border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.2)]'
              : isSilver
                ? 'bg-linear-to-t from-gray-800/40 to-gray-400/10 border-gray-400'
                : 'bg-linear-to-t from-amber-900/40 to-amber-700/10 border-amber-700';

            const borderClass = isGold ? 'border-yellow-500' : isSilver ? 'border-gray-400' : 'border-amber-700';
            const textClass = isGold ? 'text-yellow-400' : isSilver ? 'text-gray-300' : 'text-amber-600';

            return (
              <div key={user.id} className="flex flex-col items-center group relative z-10 w-28 md:w-48">
                {isGold && <div className="absolute -top-10 md:-top-14 text-4xl md:text-5xl animate-bounce drop-shadow-2xl z-20">👑</div>}

                <Link href={`/profile/${user.username}`} className={`w-16 h-16 md:w-24 md:h-24 rounded-full bg-background border-4 z-20 overflow-hidden relative transition-transform group-hover:scale-110 shadow-xl ${borderClass}`}>
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <span className="flex items-center justify-center w-full h-full text-2xl font-black text-white">{user.username.charAt(0)}</span>
                  )}
                </Link>

                <div className={`w-full ${heightClass} ${colorClass} border-t-4 rounded-t-2xl mt-[-2rem] flex flex-col items-center justify-end pb-4 px-2 transition-all`}>
                  <p className={`text-2xl md:text-4xl font-black opacity-30 ${textClass}`}>#{rank}</p>
                  <Link href={`/profile/${user.username}`} className="font-bold text-white text-sm md:text-base truncate w-full text-center hover:underline mt-2">
                    {user.username}
                  </Link>
                  <p className={`text-[10px] md:text-xs font-black mt-1 bg-background/50 px-3 py-1 rounded-full border text-center break-words ${borderClass} ${textClass}`}>
                    {getStatValue(user)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* LISTA: 4º LUGAR EM DIANTE */}
      {restOfLeaderboard.length > 0 && (
        <div className="bg-surface/50 border border-border rounded-3xl overflow-hidden shadow-xl">
          <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-background/50 border-b border-border/50 text-xs font-bold text-gray-500 uppercase tracking-wider">
            <div className="col-span-2 md:col-span-1 text-center">Rank</div>
            <div className="col-span-7 md:col-span-8">Caçador</div>
            <div className="col-span-3 text-right">{getStatLabel()}</div>
          </div>

          <div className="divide-y divide-border/50">
            {restOfLeaderboard.map((user, index) => {
              const rank = index + 4;

              return (
                <Link href={`/profile/${user.username}`} key={user.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-surface/80 transition-colors group">
                  <div className="col-span-2 md:col-span-1 text-center font-black text-gray-500 group-hover:text-white transition-colors">
                    #{rank}
                  </div>

                  <div className="col-span-7 md:col-span-8 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-background border border-border overflow-hidden shrink-0">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <span className="flex items-center justify-center w-full h-full text-sm font-bold text-white">{user.username.charAt(0)}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-white truncate group-hover:text-primary transition-colors">{user.username}</p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase truncate">{user.title || 'Iniciante'}</p>
                    </div>
                  </div>

                  <div className={`col-span-3 text-right font-black text-xs md:text-sm ${user.is_platinum ? 'text-blue-400' : 'text-white'}`}>
                    {getStatValue(user)}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {users.length === 0 && (
        <div className="text-center py-20 text-gray-500">
          <span className="text-5xl mb-4 block opacity-50">🎮</span>
          <p className="text-xl font-bold">Ainda ninguém explorou este jogo.</p>
          <p>Seja o primeiro a sincronizar as conquistas e conquiste a Coroa de Ouro!</p>
        </div>
      )}

    </div>
  );
}