import { createClient } from "@/utils/supabase/server";
import Link from "next/link";
import Image from "next/image";
import GameFilter from "./GameFilter";

interface LeaderboardsPageProps {
  searchParams: Promise<{ sort?: string, gameId?: string }>;
}

interface LeaderboardUser {
  id: string;
  username: string;
  avatar_url: string | null;
  title: string | null;
  global_level?: number;
  total_platinums?: number;
  nexus_coins?: number;
  game_stat?: string;
  is_platinum?: boolean;
}

export default async function LeaderboardsPage({ searchParams }: LeaderboardsPageProps) {
  const { sort, gameId } = await searchParams;
  const activeSort = sort === 'level' ? 'global_level' : sort === 'coins' ? 'nexus_coins' : 'total_platinums';

  const supabase = await createClient();

  const { data: availableGames } = await supabase
    .from('games')
    .select('id, title')
    .order('title');

  let users: LeaderboardUser[] = [];
  let gameTitle = "";

  if (gameId) {
    const selectedGame = availableGames?.find(g => g.id === gameId);
    if (selectedGame) gameTitle = selectedGame.title;

    const { data: topInGame } = await supabase
      .from('user_games')
      .select(`
        unlocked_achievements, 
        is_platinum, 
        last_synced_at, 
        users (id, username, avatar_url, title)
      `)
      .eq('game_id', gameId)
      .order('is_platinum', { ascending: false })
      .order('unlocked_achievements', { ascending: false })
      .order('last_synced_at', { ascending: true })
      .limit(50);

    // Mapeamento seguro garantindo 100% de compatibilidade com a interface LeaderboardUser
    if (topInGame) {
      const parsedUsers: LeaderboardUser[] = [];
      
      for (const record of topInGame) {
        if (!record.users) continue;
        
        const userObj = Array.isArray(record.users) ? record.users[0] : record.users;
        if (!userObj) continue;
        
        parsedUsers.push({
          id: userObj.id,
          username: userObj.username,
          avatar_url: userObj.avatar_url,
          title: userObj.title,
          game_stat: record.is_platinum ? '🏆 Platinado' : `${record.unlocked_achievements} Conquistas`,
          is_platinum: record.is_platinum
        });
      }
      
      users = parsedUsers;
    }

  } else {
    const { data: topUsers } = await supabase
      .from('users')
      .select('id, username, avatar_url, global_level, total_platinums, nexus_coins, title')
      .order(activeSort, { ascending: false })
      .limit(50);

    users = topUsers || [];
  }

  const podium = [
    users.length > 1 ? users[1] : null,
    users.length > 0 ? users[0] : null,
    users.length > 2 ? users[2] : null 
  ];
  const restOfLeaderboard = users.length > 3 ? users.slice(3) : [];

  const getStatValue = (user: LeaderboardUser) => {
    if (gameId) return user.game_stat;
    if (activeSort === 'global_level') return `Lvl ${user.global_level || 1}`;
    if (activeSort === 'nexus_coins') return `🪙 ${user.nexus_coins?.toLocaleString() || 0}`;
    return `🏆 ${user.total_platinums || 0}`;
  };

  const getStatLabel = () => {
    if (gameId) return "Progresso";
    if (activeSort === 'global_level') return "Nível Global";
    if (activeSort === 'nexus_coins') return "Nexus Coins";
    return "Platinas Totais";
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl mx-auto pb-20 px-4 md:px-0">

      {/* CABEÇALHO E FILTROS */}
      <div className="text-center space-y-4 pt-8 pb-4">
        <span className="text-5xl md:text-6xl drop-shadow-2xl mb-4 block">🏆</span>
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-md">
          {gameId ? `Ranking: ${gameTitle}` : "Hall da Fama"}
        </h1>
        <p className="text-gray-400 max-w-xl mx-auto">
          {gameId ? "Os caçadores mais letais deste jogo." : "Os maiores caçadores de conquistas de todo o Nexus."}
        </p>

        <div className="flex flex-col items-center justify-center gap-6 mt-10 w-full max-w-2xl mx-auto">
          <div className="w-full relative z-50">
            <GameFilter games={availableGames || []} />
          </div>

          {!gameId && (
            <div className="flex flex-wrap justify-center gap-3 mt-2">
              <Link href="/leaderboards?sort=platinums" className={`px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-md flex items-center gap-2 ${activeSort === 'total_platinums' ? 'bg-primary text-white scale-105 shadow-[0_0_15px_rgba(59,130,246,0.4)]' : 'bg-surface border border-border text-gray-400 hover:text-white hover:border-primary/50'}`}>
                <span className="text-lg">🏆</span> Platinas
              </Link>
              <Link href="/leaderboards?sort=level" className={`px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-md flex items-center gap-2 ${activeSort === 'global_level' ? 'bg-purple-600 text-white scale-105 shadow-[0_0_15px_rgba(147,51,234,0.4)]' : 'bg-surface border border-border text-gray-400 hover:text-white hover:border-purple-500/50'}`}>
                <span className="text-lg">⭐</span> Maior Nível
              </Link>
              <Link href="/leaderboards?sort=coins" className={`px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-md flex items-center gap-2 ${activeSort === 'nexus_coins' ? 'bg-yellow-600 text-white scale-105 shadow-[0_0_15px_rgba(202,138,4,0.4)]' : 'bg-surface border border-border text-gray-400 hover:text-white hover:border-yellow-500/50'}`}>
                <span className="text-lg">🪙</span> Mais Ricos
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* O PÓDIO (TOP 3) - Corrigido Tailwind h-88 */}
      {users.length > 0 && (
        <div className="flex items-end justify-center gap-3 md:gap-8 mt-16 mb-20 h-64 md:h-88">
          {podium.map((user, index) => {
            if (!user) return <div key={`empty-${index}`} className="w-24 md:w-56" />;

            const rank = index === 0 ? 2 : index === 1 ? 1 : 3;
            const isGold = rank === 1;
            const isSilver = rank === 2;

            const heightClass = isGold ? 'h-52 md:h-72' : isSilver ? 'h-40 md:h-60' : 'h-32 md:h-48';
            
            const colorClass = isGold
              ? 'bg-linear-to-t from-yellow-900/60 to-yellow-500/20 border-yellow-500 shadow-[0_0_40px_rgba(234,179,8,0.2)] backdrop-blur-md'
              : isSilver
                ? 'bg-linear-to-t from-gray-800/60 to-gray-400/20 border-gray-400 backdrop-blur-md shadow-lg'
                : 'bg-linear-to-t from-amber-900/60 to-amber-700/20 border-amber-700 backdrop-blur-md shadow-lg';

            const borderClass = isGold ? 'border-yellow-500' : isSilver ? 'border-gray-400' : 'border-amber-700';
            const textClass = isGold ? 'text-yellow-400' : isSilver ? 'text-gray-300' : 'text-amber-600';

            return (
              <div key={user.id} className={`flex flex-col items-center group relative z-10 w-[30%] md:w-56 ${isGold ? 'z-20' : 'z-10'}`}>
                
                {isGold && <div className="absolute -top-12 md:-top-16 text-5xl md:text-6xl animate-bounce drop-shadow-[0_0_15px_rgba(255,215,0,0.8)] z-30">👑</div>}

                <Link href={`/profile/${user.username}`} className={`w-16 h-16 md:w-28 md:h-28 rounded-full bg-background border-4 md:border-[5px] z-20 overflow-hidden relative transition-transform duration-300 group-hover:scale-110 shadow-2xl ${borderClass}`}>
                  {user.avatar_url ? (
                    <Image src={user.avatar_url} alt={user.username} fill sizes="(max-width: 768px) 64px, 112px" className="object-cover" />
                  ) : (
                    <span className="flex items-center justify-center w-full h-full text-2xl md:text-3xl font-black text-white">{user.username.charAt(0)}</span>
                  )}
                </Link>

                {/* Corrigido Tailwind border-t-4 */}
                <div className={`w-full ${heightClass} ${colorClass} border-t-[3px] md:border-t-4 rounded-t-3xl -mt-8 flex flex-col items-center justify-end pb-4 md:pb-6 px-2 transition-all`}>
                  <p className={`text-4xl md:text-6xl font-black opacity-20 ${textClass}`}>#{rank}</p>
                  <Link href={`/profile/${user.username}`} className="font-black text-white text-sm md:text-lg truncate w-full text-center hover:text-primary transition-colors mt-2 md:mt-3 drop-shadow-md px-2">
                    {user.username}
                  </Link>
                  <div className={`mt-2 md:mt-3 bg-background/80 backdrop-blur-xl px-3 md:px-4 py-1 md:py-1.5 rounded-full border shadow-inner ${borderClass}`}>
                    
                    {/* Corrigido Tailwind max-w-20 */}
                    <p className={`text-[10px] md:text-sm font-black truncate max-w-20 md:max-w-none ${textClass}`}>
                      {getStatValue(user)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* LISTA: 4º LUGAR EM DIANTE */}
      {restOfLeaderboard.length > 0 && (
        <div className="bg-surface/40 backdrop-blur-md border border-border rounded-3xl overflow-hidden shadow-2xl">
          <div className="grid grid-cols-12 gap-4 px-4 md:px-8 py-5 bg-background/60 border-b border-border text-xs md:text-sm font-black text-gray-500 uppercase tracking-widest">
            <div className="col-span-2 md:col-span-1 text-center">Rank</div>
            <div className="col-span-7 md:col-span-8">Caçador</div>
            <div className="col-span-3 text-right">{getStatLabel()}</div>
          </div>

          <div className="divide-y divide-border/50">
            {restOfLeaderboard.map((user, index) => {
              const rank = index + 4;

              return (
                <Link href={`/profile/${user.username}`} key={user.id} className="grid grid-cols-12 gap-4 px-4 md:px-8 py-4 items-center hover:bg-surface/80 transition-all duration-300 group">
                  
                  <div className="col-span-2 md:col-span-1 text-center font-black text-xl text-gray-600 group-hover:text-primary transition-colors">
                    #{rank}
                  </div>

                  <div className="col-span-7 md:col-span-8 flex items-center gap-3 md:gap-5">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-background border-2 border-border overflow-hidden shrink-0 relative group-hover:border-primary transition-colors">
                      {user.avatar_url ? (
                        <Image src={user.avatar_url} alt={user.username} fill sizes="(max-width: 768px) 40px, 48px" className="object-cover" />
                      ) : (
                        <span className="flex items-center justify-center w-full h-full text-sm md:text-base font-bold text-white bg-surface">{user.username.charAt(0)}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-black text-white text-sm md:text-base truncate group-hover:text-primary transition-colors">{user.username}</p>
                      <p className="text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-wider truncate mt-0.5">{user.title || 'Iniciante'}</p>
                    </div>
                  </div>

                  <div className={`col-span-3 text-right font-black text-xs md:text-base truncate ${user.is_platinum ? 'text-blue-400 drop-shadow-md' : 'text-gray-300'}`}>
                    {getStatValue(user)}
                  </div>

                </Link>
              );
            })}
          </div>
        </div>
      )}

      {users.length === 0 && (
        <div className="text-center py-24 bg-surface/20 border border-dashed border-border rounded-3xl mt-12">
          <span className="text-6xl mb-4 block opacity-50 drop-shadow-md">👻</span>
          <p className="text-2xl font-black text-white">Ranking Vazio</p>
          <p className="text-gray-400 mt-2 max-w-md mx-auto">
            {gameId ? "Ainda ninguém explorou este jogo. Seja o primeiro a sincronizar as conquistas e conquiste a Coroa de Ouro!" : "Não existem dados suficientes para gerar a classificação."}
          </p>
        </div>
      )}

    </div>
  );
}