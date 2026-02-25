import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import GuideForm from "./GuideForm";
import { GuideVoteButton, GuideCommentForm, DeleteGuideButton } from "./GuideInteractions";
import GameCardImage from "@/app/components/GameCardImage";
import Trophy from "@/app/components/Trophy";
import { Metadata } from "next";
import ClientBackButton from "@/app/components/ClientBackButton";
import CustomizationButton from "./CustomizationButton";

import { FaArrowLeft, FaArrowRight, FaUsers, FaTrophy, FaChartLine, FaCheckCircle, FaBookOpen, FaThumbsUp } from "react-icons/fa";
import { FaCommentDots } from "react-icons/fa6";

export const metadata: Metadata = {
  title: "Detalhes do Jogo | Nexus Achievements",
  description: "Explore os detalhes do jogo no Nexus Achievements, veja seu progresso em conquistas, compare com a comunidade e descubra guias criados por outros jogadores.",
}

interface GamePageProps {
  params: Promise<{ gameId: string }>;
  searchParams: Promise<{ tab?: string, guideId?: string, back?: string, page?: string }>;
}

type SteamSchemaAchievement = { name: string; defaultvalue: number; displayName: string; hidden: number; description?: string; icon: string; icongray: string; };
type SteamPlayerAchievement = { apiname: string; achieved: number; unlocktime?: number; };
type CommunityUser = { user_id: string; is_platinum: boolean; unlocked_achievements: number; total_achievements: number; playtime_minutes: number; last_synced_at: string; users: { username: string; avatar_url: string | null; } | null; };
interface SteamPercentage { name: string; percent: number; }
interface GuideAuthor { username: string; avatar_url: string | null; title: string | null; }
interface GameGuide { id: string; author_id: string; title: string; content: string; upvotes: number; created_at: string; users: GuideAuthor | null; }
interface GuideComment { id: string; content: string; created_at: string; users: { username: string; avatar_url: string | null; } | null; }
interface RawGuideData { id: string; game_id: string; author_id: string; title: string; content: string; upvotes: number; created_at: string; users: GuideAuthor | GuideAuthor[]; }
interface RawCommentData { id: string; content: string; created_at: string; users: { username: string; avatar_url: string | null } | { username: string; avatar_url: string | null }[]; }

const renderGuideContent = (text: string) => {
  const parts = text.split(/(!\[.*?\]\(.*?\))/g);
  return parts.map((part, index) => {
    const match = part.match(/!\[(.*?)\]\((.*?)\)/);
    if (match) {
      return (
        <div key={index} className="relative w-full aspect-video my-6">
          <Image src={match[2] as string} alt={match[1] || 'Imagem do guia'} fill className="rounded-2xl border border-white/5 shadow-2xl object-contain bg-black/50" unoptimized />
        </div>
      );
    }
    return <span key={index}>{part}</span>;
  });
};

export default async function GamePage(props: GamePageProps) {
  const { gameId } = await props.params;
  const { tab, guideId, back, page } = await props.searchParams;
  const activeTab = tab === 'guides' ? 'guides' : 'overview';

  const currentPage = Number(page) || 1;
  const ACHIEVEMENTS_PER_PAGE = 30;

  const backUrl = back ? back : '/games';
  const backQueryString = back ? `&back=${encodeURIComponent(back)}` : '';

  let backTitle = "Voltar à Biblioteca";
  if (backUrl.includes('/profile')) backTitle = "Voltar ao Perfil";
  else if (backUrl.includes('/leaderboards')) backTitle = "Voltar ao Ranking";
  else if (backUrl.includes('/social')) backTitle = "Voltar à Comunidade";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let isAdmin = false;
  if (user) {
    const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single();
    isAdmin = userData?.role === 'admin';
  }

  const { data: game, error } = await supabase.from("games").select("*").eq("id", gameId).single();
  if (error || !game) notFound();

  const appId = gameId.replace("steam-", "");
  const STEAM_KEY = process.env.STEAM_API_KEY;
  const SGDB_KEY = process.env.STEAMGRIDDB_API_KEY;

  let updatedBanner = game.banner_url;
  let updatedCover = game.cover_url;

  // Cache SteamGridDB
  let needsDbUpdate = false;
  if ((!game.banner_url || !game.cover_url) && SGDB_KEY) {
    try {
      if (!game.banner_url) {
        const heroRes = await fetch(`https://www.steamgriddb.com/api/v2/heroes/steam/${appId}`, { headers: { Authorization: `Bearer ${SGDB_KEY}` } });
        const heroData = await heroRes.json();
        if (heroData.success && heroData.data.length > 0) {
          updatedBanner = heroData.data[0].url;
          needsDbUpdate = true;
        }
      }
      if (!game.cover_url) {
        const gridRes = await fetch(`https://www.steamgriddb.com/api/v2/grids/steam/${appId}`, { headers: { Authorization: `Bearer ${SGDB_KEY}` } });
        const gridData = await gridRes.json();
        if (gridData.success && gridData.data.length > 0) {
          updatedCover = gridData.data[0].url;
          needsDbUpdate = true;
        }
      }
      if (needsDbUpdate) {
        await supabase.from('games').update({ banner_url: updatedBanner, cover_url: updatedCover }).eq('id', gameId);
      }
    } catch (e) { console.error("Erro Cache SGDB", e); }
  }

  const { data: communityRaw } = await supabase.from("user_games").select(`user_id, is_platinum, unlocked_achievements, total_achievements, playtime_minutes, last_synced_at, users ( username, avatar_url )`).eq("game_id", gameId);
  const communityData = (communityRaw as unknown as CommunityUser[]) || [];
  const userProgress = communityData.find(p => p.user_id === user?.id) || null;

  const totalPlayers = communityData.length;
  const totalPlatinums = communityData.filter(p => p.is_platinum).length;
  const completionRate = totalPlayers > 0 ? Math.round((totalPlatinums / totalPlayers) * 100) : 0;

  const total = userProgress?.total_achievements || game.total_achievements || 0;
  const unlocked = userProgress?.unlocked_achievements || 0;
  const percentage = total > 0 ? Math.round((unlocked / total) * 100) : 0;
  const isPlat = userProgress?.is_platinum;

  const playtimeHours = userProgress ? Math.floor(userProgress.playtime_minutes / 60) : 0;
  const playtimeMins = userProgress ? userProgress.playtime_minutes % 60 : 0;

  let achievementsDetails: SteamSchemaAchievement[] = [];
  const playerUnlockedMap: Record<string, boolean> = {};
  const globalPercentages: Record<string, number> = {};

  if (activeTab === 'overview' && STEAM_KEY && !isNaN(Number(appId))) {
    try {
      const schemaRes = await fetch(`http://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?key=${STEAM_KEY}&appid=${appId}&l=brazilian`, { next: { revalidate: 86400 } });
      if (schemaRes.ok) {
        const schemaData = await schemaRes.json();
        if (schemaData.game?.availableGameStats?.achievements) achievementsDetails = schemaData.game.availableGameStats.achievements;
      }

      const pctRes = await fetch(`http://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v0002/?gameid=${appId}`, { next: { revalidate: 3600 } });
      if (pctRes.ok) {
        const pctData = await pctRes.json();
        pctData.achievementpercentages?.achievements.forEach((a: SteamPercentage) => {
          globalPercentages[a.name] = a.percent;
        });
      }

      if (user && userProgress) {
        const { data: userData } = await supabase.from('users').select('steam_id').eq('id', user.id).single();
        if (userData?.steam_id) {
          const playerAchRes = await fetch(`http://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/?appid=${appId}&key=${STEAM_KEY}&steamid=${userData.steam_id}&l=brazilian`, { cache: 'no-store' });
          if (playerAchRes.ok) {
            const playerAchData = await playerAchRes.json();
            playerAchData.playerstats?.achievements?.forEach((ach: SteamPlayerAchievement) => {
              playerUnlockedMap[ach.apiname] = ach.achieved === 1;
            });
          }
        }
      }
    } catch (e) { console.error("Erro API Steam", e); }
  }

  const getTrophyType = (apiname: string): "bronze" | "silver" | "gold" => {
    const percent = globalPercentages[apiname] || 100;
    if (percent <= 10) return "gold";
    if (percent <= 50) return "silver";
    return "bronze";
  };

  const totalAchievementsItems = achievementsDetails.length;
  const totalAchievementPages = Math.ceil(totalAchievementsItems / ACHIEVEMENTS_PER_PAGE);
  const startIndex = (currentPage - 1) * ACHIEVEMENTS_PER_PAGE;
  const paginatedAchievements = achievementsDetails.slice(startIndex, startIndex + ACHIEVEMENTS_PER_PAGE);

  const hasNextPage = currentPage < totalAchievementPages;
  const hasPrevPage = currentPage > 1;

  const buildUrl = (pageNumber: number) => {
    const sp = new URLSearchParams();
    if (back) sp.set('back', back);
    sp.set('tab', 'overview');
    sp.set('page', pageNumber.toString());
    return `/games/${gameId}?${sp.toString()}`;
  };

  let guides: GameGuide[] = [];
  let selectedGuideComments: GuideComment[] = [];
  let hasVoted = false;
  let selectedGuide: GameGuide | null = null;

  if (activeTab === 'guides') {
    const { data: guidesData } = await supabase.from('game_guides').select('id, game_id, author_id, title, content, upvotes, created_at, users!game_guides_author_id_fkey ( username, avatar_url, title )').eq('game_id', gameId).order('created_at', { ascending: false });
    if (guidesData) {
      guides = (guidesData as unknown as RawGuideData[]).map((g) => ({ ...g, users: Array.isArray(g.users) ? g.users[0] : g.users })) as GameGuide[];
    }
    if (guideId && guides.length > 0) {
      selectedGuide = guides.find(g => g.id === guideId) || null;
      if (selectedGuide) {
        const { data: commentsData } = await supabase.from('guide_comments').select('id, content, created_at, users ( username, avatar_url )').eq('guide_id', guideId).order('created_at', { ascending: true });
        if (commentsData) {
          selectedGuideComments = (commentsData as unknown as RawCommentData[]).map((c) => ({ ...c, users: Array.isArray(c.users) ? c.users[0] : c.users })) as GuideComment[];
        }
        if (user) {
          const { data: vote } = await supabase.from('guide_votes').select('guide_id').eq('guide_id', guideId).eq('user_id', user.id).maybeSingle();
          if (vote) hasVoted = true;
        }
      }
    }
  }

  return (
    <div className="min-h-screen pb-32 animate-in fade-in duration-500 relative">

      <ClientBackButton href={backUrl} title={backTitle} />

      <div className="-mx-4 md:-mx-8 -mt-4 md:-mt-8 h-56 sm:h-64 md:h-80 lg:h-100 w-full relative overflow-hidden border-b border-white/5 shadow-2xl rounded-b-4xl bg-background group isolate transform-gpu">
        <GameCardImage src={updatedBanner} title={game.title} isBanner={true} />
        <div className="absolute inset-0 bg-linear-to-t from-background via-background/40 to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-0 bg-linear-to-r from-background/90 via-background/20 to-transparent z-10 pointer-events-none" />

        {/* APENAS ADMIN */}
        {isAdmin && (
          <CustomizationButton
            gameId={gameId}
            type="banner"
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 opacity-0 group-hover:opacity-100"
          />
        )}
      </div>

      <div className="max-w-6xl mx-auto -mt-20 sm:-mt-24 md:-mt-32 relative z-20 px-4 md:px-0">
        <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-start md:items-end">

          <div className="w-32 md:w-64 aspect-3/4 rounded-2xl md:rounded-4xl border-4 md:border-[6px] border-background bg-surface overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative shrink-0 group z-30 isolate transform-gpu">
            <GameCardImage src={updatedCover} title={game.title} />

            {/* APENAS ADMIN */}
            {isAdmin && (
              <CustomizationButton
                gameId={gameId}
                type="cover"
                className="absolute top-4 right-3 opacity-0 group-hover:opacity-100"
              />
            )}
          </div>

          <div className="flex-1 w-full pb-2 md:pb-6 min-w-0">
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter drop-shadow-2xl leading-none truncate max-w-full">{game.title}</h1>
            <p className="text-primary font-bold tracking-widest uppercase text-[10px] md:text-xs mt-3 md:mt-4 bg-primary/10 inline-block px-3 py-1.5 rounded-lg border border-primary/20">{game.developer || "Steam"}</p>

            {userProgress && (
              <div className={`mt-6 md:mt-8 p-5 md:p-6 rounded-4xl border backdrop-blur-md relative overflow-hidden transition-all duration-500 shadow-xl w-full ${isPlat ? 'bg-cyan-950/40 border-cyan-500/40 shadow-cyan-900/20' : 'bg-surface/80 border-white/5'}`}>
                {isPlat && <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 mix-blend-overlay pointer-events-none"></div>}

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 relative z-10 w-full">
                  <div className="flex-1 flex items-center gap-4 md:gap-6 min-w-0">
                    {isPlat && (
                      <div className="shrink-0 w-12 h-12 md:w-16 md:h-16 animate-pulse drop-shadow-[0_0_15px_rgba(34,211,238,0.8)] hidden sm:block">
                        <Trophy type="platinum" className="w-full h-full" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-1">
                        <h3 className="text-xs md:text-sm font-black uppercase tracking-widest text-white truncate">
                          {isPlat ? <span className="text-cyan-400 flex items-center gap-1"><Trophy type="platinum" className="w-6 h-6" /> Platina Conquistada</span> : percentage > 0 ? "⚔️ Jornada em curso" : "🎯 Iniciar Caçada"}
                        </h3>
                        <span className={`text-sm md:text-base font-black shrink-0 ${isPlat ? 'text-cyan-400' : 'text-gray-300'}`}>
                          {unlocked} <span className="text-gray-500 font-medium">/ {total}</span> <span className="text-[10px] md:text-xs text-gray-400 font-bold bg-black/40 px-2 py-0.5 rounded-md ml-1">{percentage}%</span>
                        </span>
                      </div>

                      <div className="h-3 md:h-4 w-full bg-background/80 rounded-full overflow-hidden border border-white/5 shadow-inner">
                        <div className={`h-full transition-all duration-1000 ease-out relative ${isPlat ? 'bg-linear-to-r from-cyan-400 via-white/50 to-cyan-400' : 'bg-linear-to-r from-primary/80 to-primary'}`} style={{ width: `${percentage}%` }}>
                          <div className="absolute inset-0 bg-linear-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-background/60 px-4 md:px-5 py-2.5 md:py-3 rounded-xl md:rounded-2xl border border-white/5 flex flex-row md:flex-col items-center justify-between md:justify-center w-full md:w-auto md:min-w-32 shadow-inner shrink-0">
                    <span className="text-[9px] md:text-[10px] font-black text-gray-500 uppercase tracking-widest md:mb-1">Tempo de Jogo</span>
                    <span className="text-sm md:text-xl font-black text-white">{playtimeHours}h {playtimeMins}m</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ABAS */}
        <div className="flex gap-2 md:gap-4 mt-8 md:mt-12 mb-8 md:mb-10 border-b border-white/10 pb-px">
          <Link href={`/games/${gameId}?tab=overview${backQueryString}`} scroll={false} className={`pb-4 px-2 text-xs md:text-sm font-black transition-all tracking-widest relative ${activeTab === 'overview' ? 'text-primary' : 'text-gray-500 hover:text-gray-300'}`}>
            VISÃO GERAL
            {activeTab === 'overview' && <span className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-t-full shadow-[0_0_10px_rgba(59,130,246,0.8)]"></span>}
          </Link>
          <Link href={`/games/${gameId}?tab=guides${backQueryString}`} scroll={false} className={`pb-4 px-2 text-xs md:text-sm font-black transition-all tracking-widest flex items-center gap-2 relative ${activeTab === 'guides' ? 'text-primary' : 'text-gray-500 hover:text-gray-300'}`}>
            GUIAS DA COMUNIDADE
            {activeTab === 'guides' && <span className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-t-full shadow-[0_0_10px_rgba(59,130,246,0.8)]"></span>}
          </Link>
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-8 md:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-6">
              <div className="bg-surface/60 backdrop-blur-xl border border-white/5 p-4 md:p-5 rounded-2xl md:rounded-3xl flex items-center gap-4 shadow-sm">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-500/10 text-blue-400 rounded-xl md:rounded-2xl flex items-center justify-center text-lg md:text-2xl shrink-0"><FaUsers /></div>
                <div className="min-w-0"><p className="text-[9px] md:text-[10px] text-gray-500 font-bold uppercase tracking-widest truncate">Caçadores</p><p className="text-lg md:text-3xl font-black text-white">{totalPlayers}</p></div>
              </div>
              <div className="bg-surface/60 backdrop-blur-xl border border-white/5 p-4 md:p-5 rounded-2xl md:rounded-3xl flex items-center gap-4 shadow-sm">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-yellow-500/10 text-yellow-500 rounded-xl md:rounded-2xl flex items-center justify-center text-lg md:text-2xl shrink-0"><FaTrophy /></div>
                <div className="min-w-0"><p className="text-[9px] md:text-[10px] text-gray-500 font-bold uppercase tracking-widest truncate">Platinas Reais</p><p className="text-lg md:text-3xl font-black text-white">{totalPlatinums}</p></div>
              </div>
              <div className="bg-surface/60 backdrop-blur-xl border border-white/5 p-4 md:p-5 rounded-2xl md:rounded-3xl flex items-center gap-4 shadow-sm">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-green-500/10 text-green-400 rounded-xl md:rounded-2xl flex items-center justify-center text-lg md:text-2xl shrink-0"><FaChartLine /></div>
                <div className="min-w-0"><p className="text-[9px] md:text-[10px] text-gray-500 font-bold uppercase tracking-widest truncate">Taxa Global</p><p className="text-lg md:text-3xl font-black text-white">{completionRate}%</p></div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-xl md:text-2xl font-black text-white flex items-center gap-3">
                  <FaTrophy className="text-primary text-2xl md:text-3xl" /> Conquistas <span className="text-gray-500 text-base font-bold">({totalAchievementsItems})</span>
                </h2>
              </div>

              {paginatedAchievements.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
                    {paginatedAchievements.map((ach) => {
                      const isUnlocked = playerUnlockedMap[ach.name];
                      const rarity = getTrophyType(ach.name);

                      const baseIconUrl = isUnlocked ? ach.icon : (ach.icongray || ach.icon);
                      const finalIconUrl = baseIconUrl || updatedCover || 'https://via.placeholder.com/64/1a1a1a/ffffff?text=X';

                      return (
                        <div key={ach.name} className={`flex items-start gap-3 md:gap-4 border p-3 md:p-4 rounded-2xl transition-all duration-300 group ${isUnlocked ? 'border-primary/30 bg-primary/5 shadow-sm' : 'border-white/5 bg-surface/40 opacity-80 grayscale hover:grayscale-0 hover:opacity-100'}`}>
                          <div className="relative w-12 h-12 md:w-14 md:h-14 shrink-0 group-hover:scale-105 transition-transform">
                            <div className="w-full h-full rounded-xl overflow-hidden border border-white/10 relative bg-background shadow-md">
                              <Image src={finalIconUrl} alt={ach.displayName} fill className="object-cover" unoptimized />
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 md:w-6 md:h-6 drop-shadow-[0_2px_5px_rgba(0,0,0,0.8)] z-10">
                              <Trophy type={rarity} className="w-full h-full" />
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <p className={`font-black text-xs md:text-sm truncate ${isUnlocked ? 'text-white' : 'text-gray-300'}`}>{ach.displayName}</p>
                              {isUnlocked && <FaCheckCircle className="text-green-500 text-xs md:text-sm shrink-0" />}
                            </div>
                            <p className={`text-[10px] md:text-xs mt-1 line-clamp-2 leading-relaxed ${isUnlocked ? 'text-gray-400' : 'text-gray-500 italic'}`}>{ach.description || 'Conquista oculta.'}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {totalAchievementPages > 1 && (
                    <div className="flex items-center justify-between border-t border-white/5 pt-6 mt-8 mb-12 gap-2">
                      <Link href={hasPrevPage ? buildUrl(currentPage - 1) : '#'} scroll={false} className={`flex items-center justify-center gap-2 px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl font-black text-xs sm:text-sm transition-all ${hasPrevPage ? 'bg-surface border border-white/10 text-white hover:bg-primary hover:border-primary shadow-sm' : 'bg-surface/30 border border-transparent text-gray-600 cursor-not-allowed pointer-events-none'}`}>
                        <FaArrowLeft /> <span className="hidden sm:inline">Anterior</span>
                      </Link>

                      <span className="text-gray-400 font-bold text-[10px] sm:text-xs px-3 py-2 bg-surface/50 border border-white/5 rounded-lg uppercase tracking-widest text-center">
                        <span className="hidden sm:inline">Página </span>{currentPage} / {totalAchievementPages}
                      </span>

                      <Link href={hasNextPage ? buildUrl(currentPage + 1) : '#'} scroll={false} className={`flex items-center justify-center gap-2 px-4 py-2.5 sm:px-6 sm:py-3 rounded-xl font-black text-xs sm:text-sm transition-all ${hasNextPage ? 'bg-surface border border-white/10 text-white hover:bg-primary hover:border-primary shadow-sm' : 'bg-surface/30 border border-transparent text-gray-600 cursor-not-allowed pointer-events-none'}`}>
                        <span className="hidden sm:inline">Próxima</span> <FaArrowRight />
                      </Link>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-surface/20 border border-dashed border-white/10 p-10 rounded-3xl text-center mb-12">
                  <p className="text-gray-500 font-bold text-sm">Nenhuma conquista registrada na API da Steam para este jogo.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'guides' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full min-w-0 pb-4">
            {guideId && selectedGuide ? (
              <div className="bg-surface/40 backdrop-blur-xl border border-white/5 rounded-4xl p-5 sm:p-6 md:p-10 shadow-2xl relative w-full min-w-0">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-primary via-purple-500 to-primary"></div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 md:mb-8">
                  <ClientBackButton
                    href={`/games/${gameId}?tab=guides${backQueryString}`}
                    title="Voltar aos Guias"
                  />
                  {user?.id === selectedGuide.author_id && (
                    <DeleteGuideButton guideId={selectedGuide.id} gameId={gameId} />
                  )}
                </div>
                <h2 className="text-2xl md:text-4xl lg:text-5xl font-black text-white mb-5 md:mb-6 leading-tight drop-shadow-lg wrap-break-word w-full">{selectedGuide.title}</h2>
                <div className="flex items-center gap-3 md:gap-4 mb-6 md:mb-8 pb-6 md:pb-8 border-b border-white/5 w-full min-w-0">
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-full overflow-hidden bg-background border border-white/10 relative shrink-0">
                    {selectedGuide.users?.avatar_url ? <Image src={selectedGuide.users.avatar_url} alt="Avatar" fill className="object-cover" unoptimized /> : <span className="flex items-center justify-center w-full h-full text-lg font-black text-primary bg-primary/10">{selectedGuide.users?.username.charAt(0)}</span>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs md:text-sm text-gray-400 truncate">Por <Link href={`/profile/${selectedGuide.users?.username}`} className="text-white font-black hover:text-primary transition-colors">{selectedGuide.users?.username}</Link></p>
                    <p className="text-[10px] md:text-xs text-gray-500 mt-1 font-bold tracking-widest uppercase truncate">{new Date(selectedGuide.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
                <div className="text-sm md:text-base text-gray-300 leading-relaxed whitespace-pre-wrap wrap-break-word w-full overflow-hidden">
                  {renderGuideContent(selectedGuide.content)}
                </div>
                <div className="mt-10 md:mt-12 pt-6 md:pt-8 border-t border-white/5 flex flex-col items-center gap-3 md:gap-4 w-full">
                  <p className="text-[10px] md:text-xs font-black text-gray-500 uppercase tracking-widest text-center">Este guia ajudou-o na jornada?</p>
                  <GuideVoteButton guideId={selectedGuide.id} gameId={gameId} initialVotes={selectedGuide.upvotes} hasVoted={hasVoted} />
                </div>
                <div className="mt-12 md:mt-16 bg-background/50 border border-white/5 p-4 sm:p-6 md:p-8 rounded-3xl w-full min-w-0">
                  <h3 className="text-lg md:text-xl font-black text-white flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
                    <FaCommentDots className="text-primary" /> Comentários
                    <span className="bg-primary/20 border border-primary/30 px-2 md:px-3 py-1 rounded-lg text-xs md:text-sm text-primary">{selectedGuideComments.length}</span>
                  </h3>
                  <div className="w-full"><GuideCommentForm guideId={selectedGuide.id} gameId={gameId} /></div>
                  <div className="mt-6 md:mt-8 space-y-3 md:space-y-4 w-full">
                    {selectedGuideComments.map(comment => (
                      <div key={comment.id} className="bg-surface/50 border border-white/5 p-4 md:p-5 rounded-2xl flex gap-3 md:gap-4 w-full min-w-0">
                        <Link href={`/profile/${comment.users?.username}`} className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden shrink-0 border border-white/10 relative hover:border-primary transition-colors">
                          {comment.users?.avatar_url ? <Image src={comment.users.avatar_url} fill className="object-cover" alt="Avatar" unoptimized /> : <span className="flex items-center justify-center w-full h-full font-black text-primary bg-primary/10">{comment.users?.username.charAt(0)}</span>}
                        </Link>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 mb-1 truncate">
                            <Link href={`/profile/${comment.users?.username}`} className="font-bold text-white text-xs md:text-sm hover:text-primary transition-colors truncate">{comment.users?.username}</Link>
                            <span className="text-[8px] md:text-[10px] font-bold text-gray-500 uppercase tracking-widest shrink-0">{new Date(comment.created_at).toLocaleDateString('pt-BR')}</span>
                          </div>
                          <p className="text-xs md:text-sm text-gray-300 leading-relaxed wrap-break-word">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                    {selectedGuideComments.length === 0 && (
                      <p className="text-center text-xs md:text-sm text-gray-500 py-4 font-medium">Seja o primeiro a comentar neste guia.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6 md:space-y-8 w-full min-w-0">
                {user ? (
                  <div className="w-full"><GuideForm gameId={gameId} /></div>
                ) : (
                  <div className="bg-surface/50 border border-white/5 p-6 md:p-8 rounded-3xl text-center shadow-inner w-full">
                    <p className="text-xs md:text-sm text-gray-400 font-bold">Inicie sessão no Nexus para partilhar o seu conhecimento.</p>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 w-full">
                  {guides.length === 0 ? (
                    <div className="col-span-1 md:col-span-2 py-16 md:py-24 text-center flex flex-col items-center justify-center opacity-60 bg-surface/20 border border-dashed border-white/10 rounded-3xl w-full">
                      <FaBookOpen className="text-5xl md:text-6xl mb-4 text-white/20 drop-shadow-md" />
                      <h3 className="text-xl md:text-2xl font-black text-white">Nenhum guia disponível</h3>
                      <p className="text-xs md:text-sm mt-2 text-gray-400 max-w-xs md:max-w-sm px-4 mx-auto">A comunidade precisa de si. Seja o primeiro a escrever um guia de platina para este jogo!</p>
                    </div>
                  ) : (
                    guides.map(guide => (
                      <Link href={`/games/${gameId}?tab=guides&guideId=${guide.id}${backQueryString}`} key={guide.id} className="bg-surface/40 backdrop-blur-sm border border-white/5 p-5 md:p-6 rounded-3xl hover:border-primary/50 hover:bg-surface/80 transition-all duration-300 group flex flex-col h-full shadow-md hover:shadow-xl hover:-translate-y-1 w-full min-w-0">
                        <div className="flex-1 w-full min-w-0">
                          <h3 className="text-lg md:text-xl font-black text-white mb-2 md:mb-3 group-hover:text-primary transition-colors line-clamp-2 leading-tight wrap-break-word">{guide.title}</h3>
                          <p className="text-xs md:text-sm text-gray-400 line-clamp-3 leading-relaxed mb-4 md:mb-6 wrap-break-word">{guide.content.replace(/!\[.*?\]\(.*?\)/g, '🖼️ [Imagem Anexa] ')}</p>
                        </div>
                        <div className="flex items-center justify-between pt-4 md:pt-5 border-t border-white/5 w-full min-w-0 gap-2">
                          <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                            <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-background overflow-hidden relative border border-white/10 group-hover:border-primary transition-colors shrink-0">
                              {guide.users?.avatar_url ? <Image src={guide.users.avatar_url} fill className="object-cover" alt="Avatar" unoptimized /> : <span className="flex items-center justify-center w-full h-full text-[10px] md:text-xs font-black text-primary bg-primary/10">{guide.users?.username.charAt(0)}</span>}
                            </div>
                            <span className="text-[10px] md:text-xs font-bold text-gray-400 group-hover:text-white transition-colors truncate">{guide.users?.username}</span>
                          </div>
                          <div className="flex items-center gap-1.5 bg-background/80 border border-white/5 px-2.5 md:px-3 py-1 md:py-1.5 rounded-lg md:rounded-xl text-[10px] md:text-xs font-black text-gray-400 shadow-inner group-hover:text-primary transition-colors shrink-0">
                            <FaThumbsUp /> {guide.upvotes}
                          </div>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}