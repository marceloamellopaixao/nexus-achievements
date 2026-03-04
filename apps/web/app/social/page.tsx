import React from "react";
import { createClient } from "@/utils/supabase/server";
import Image from "next/image";
import Link from "next/link";
import AutoSync from "../components/AutoSync";
import Trophy from "../components/Trophy";
import { FaArrowRight, FaSteam, FaUsers, FaMoon, FaTrophy, FaPlaystation, FaXbox, FaPlus } from "react-icons/fa";
import { BiSolidCoinStack } from "react-icons/bi";
import { IoSettingsSharp } from "react-icons/io5";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Social | Nexus Achievements",
  description: "Acompanhe conquistas recentes, compare progresso e explore o feed da comunidade.",
}

interface SocialPageProps { searchParams: Promise<{ feed?: string }>; }

type GlobalActivity = {
  id: string; user_id: string; game_id: string | null; game_name: string; achievement_name: string; achievement_icon: string | null; rarity: string | null; points_earned: number; platform: string; created_at: string;
  users: { username: string; avatar_url: string | null; } | null;
  games: { banner_url: string | null; cover_url: string | null; } | null;
};

// Helper para ícones de plataforma
const PlatformIcon = ({ platform }: { platform: string }) => {
  if (platform === 'PlayStation') return <FaPlaystation className="text-[#00439C] dark:text-[#3878f7]" title="PlayStation" />;
  if (platform === 'Xbox') return <FaXbox className="text-[#107C10] dark:text-[#2ca243]" title="Xbox" />;
  return <FaSteam className="text-[#1b2838] dark:text-[#c5d4e4]" title="Steam" />;
}

// Gera o gradiente de luz atmosférica
const getAtmosphericLight = (platform: string, hasPlatinum: boolean) => {
  if (hasPlatinum) {
    return "bg-[radial-gradient(ellipse_at_top_center,_var(--tw-gradient-stops))] from-cyan-400/40 via-cyan-950/10 to-transparent opacity-100 blur-3xl scale-125";
  }
  switch (platform) {
    case 'PlayStation':
      return "bg-[radial-gradient(circle_at_top_left,_var(--tw-gradient-stops))] from-[#3878f7]/30 via-[#000000]/10 to-transparent opacity-80 blur-3xl scale-150 -ml-1/5";
    case 'Xbox':
      return "bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-[#2ca243]/30 via-[#000000]/10 to-transparent opacity-80 blur-3xl scale-150 -mr-1/5";
    case 'Steam':
    default:
      return "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#5f768d]/25 via-[#0a0a0a]/10 to-transparent opacity-70 blur-3xl scale-125";
  }
};

export default async function SocialPage({ searchParams }: SocialPageProps) {
  const { feed } = await searchParams;
  const currentPath = `/social`;
  const activeFeed = feed === 'following' ? 'following' : 'global';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let activities: GlobalActivity[] = [];
  let isFollowingNoOne = false;

  const querySelect = `id, user_id, game_id, game_name, achievement_name, achievement_icon, rarity, points_earned, platform, created_at, users ( username, avatar_url ), games ( banner_url, cover_url )`;

  if (activeFeed === 'following' && user) {
    const { data: follows } = await supabase.from('user_follows').select('following_id').eq('follower_id', user.id);
    const followingIds = follows?.map(f => f.following_id) || [];

    if (followingIds.length > 0) {
      const { data } = await supabase.from("global_activity").select(querySelect).in('user_id', followingIds).order("created_at", { ascending: false }).limit(60);
      activities = data as unknown as GlobalActivity[] || [];
    } else {
      isFollowingNoOne = true;
    }
  } else {
    const { data } = await supabase.from("global_activity").select(querySelect).order("created_at", { ascending: false }).limit(60);
    activities = data as unknown as GlobalActivity[] || [];
  }

  type ActivityUser = { username: string; avatar_url: string | null; };
  type GameData = { banner_url: string | null; cover_url: string | null; };

  const groupedActivities: {
    key: string; user: ActivityUser; game_id: string | null; game_name: string; game: GameData | null; platform: string; date: string; achievements: GlobalActivity[]; hasPlatinum: boolean;
  }[] = [];

  activities.forEach(activity => {
    const activityUser = Array.isArray(activity.users) ? activity.users[0] : activity.users;
    const gameData = Array.isArray(activity.games) ? activity.games[0] : activity.games;
    if (!activityUser) return;

    const dateStr = new Date(activity.created_at).toLocaleDateString();
    const groupKey = `${activity.user_id}-${activity.game_name}-${dateStr}`;

    let group = groupedActivities.find(g => g.key === groupKey);

    if (!group) {
      group = { key: groupKey, user: activityUser, game_id: activity.game_id, game_name: activity.game_name, game: gameData, platform: activity.platform, date: activity.created_at, achievements: [], hasPlatinum: false };
      groupedActivities.push(group);
    }

    if (activity.achievement_name.includes('PLATINOU') || activity.achievement_name.includes('PLATINA CONQUISTADA')) {
      group.hasPlatinum = true;
      group.achievements.unshift(activity);
    } else {
      group.achievements.push(activity);
    }
  });

  const timeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffInSeconds < 86400) return "Hoje";
    if (diffInSeconds < 172800) return "Ontem";
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 max-w-3xl mx-auto pb-24 px-3 sm:px-0 mt-6">
      <AutoSync />

      {/* TABS DE NAVEGAÇÃO */}
      <div className="sticky top-4 z-40 flex items-center justify-between bg-[#0a0a0a]/60 backdrop-blur-md border border-white/10 p-1.5 rounded-2xl shadow-2xl gap-2">
        <div className="flex bg-white/5 p-1 rounded-xl flex-1">
          <Link href="/social?feed=global" className={`flex-1 px-4 py-2 rounded-lg text-[10px] sm:text-xs font-black transition-all text-center uppercase tracking-widest ${activeFeed === 'global' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
            Global
          </Link>
          <Link href="/social?feed=following" className={`flex-1 px-4 py-2 rounded-lg text-[10px] sm:text-xs font-black transition-all text-center uppercase tracking-widest ${activeFeed === 'following' ? 'bg-primary text-white shadow-md shadow-primary/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
            Amigos
          </Link>
        </div>
        <Link href="/integrations" className="group flex items-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all shrink-0 hover:border-white/20">
          <IoSettingsSharp className="text-sm group-hover:rotate-90 transition-transform" />
          <span className="hidden sm:inline">Sincronizar</span>
        </Link>
      </div>

      {/* FEED DE ATIVIDADES */}
      <div className="space-y-8">
        {isFollowingNoOne ? (
          <div className="bg-[#0a0a0a]/80 border border-white/5 border-dashed rounded-4xl py-24 text-center flex flex-col items-center shadow-inner backdrop-blur-sm">
            <FaUsers className="text-6xl text-white/10 mb-6 animate-pulse" />
            <p className="text-gray-400 font-bold tracking-tight text-sm uppercase">O seu feed de amigos está deserto.</p>
            <Link href="/leaderboards" className="mt-8 flex items-center gap-3 bg-primary/10 text-primary px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-lg shadow-primary/10">
              Encontrar Caçadores <FaArrowRight />
            </Link>
          </div>
        ) : groupedActivities.length === 0 ? (
          <div className="bg-[#0a0a0a]/80 border border-white/5 border-dashed rounded-4xl py-24 text-center flex flex-col items-center shadow-inner backdrop-blur-sm">
            <FaMoon className="text-6xl text-white/10 mb-6 animate-pulse" />
            <p className="text-gray-400 font-bold text-sm tracking-tight uppercase">Nenhuma atividade recente.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-10">
            {groupedActivities.map((group) => {
              const MAX_ACHIEVEMENTS = 6;
              const hiddenCount = group.achievements.length - MAX_ACHIEVEMENTS;
              const hasMore = hiddenCount > 0;
              const visibleAchievements = group.achievements.slice(0, MAX_ACHIEVEMENTS);

              return (
                <div key={group.key} className={`group relative flex flex-col rounded-[3rem] border transition-all duration-500 overflow-hidden shadow-2xl ${group.hasPlatinum
                  ? 'border-cyan-500/50 shadow-[0_0_60px_-15px_rgba(6,182,212,0.3)]'
                  : 'border-white/5 hover:border-white/10 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.7)]'
                  } bg-[#0a0a0a]`}>

                  {/* CAMADAS DE LUZ E FUNDO */}
                  <div className={`absolute top-0 left-0 right-0 h-full pointer-events-none transition-all duration-1000 ${getAtmosphericLight(group.platform, group.hasPlatinum)}`}></div>
                  <div className="absolute inset-0 bg-[#0a0a0a]/20 backdrop-blur-[1px] z-0 pointer-events-none"></div>

                  {/* HEADER DO CARD */}
                  <div className="relative z-10 p-6 sm:p-8 pb-4 flex flex-row items-center justify-between gap-4">

                    {/* ESQUERDA: Usuário */}
                    <div className="flex items-center gap-4 sm:gap-5">
                      <Link href={`/profile/${group.user.username}`} className="relative shrink-0">
                        <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-3xl overflow-hidden border-2 transition-all duration-500 ${group.hasPlatinum ? 'border-cyan-400 shadow-[0_0_25px_rgba(34,211,238,0.5)] scale-105' : 'border-white/10 group-hover:border-white/30'}`}>
                          {group.user.avatar_url ? (
                            // 🔥 quality={100} garante Avatar nítido
                            <Image src={group.user.avatar_url} alt={group.user.username} fill sizes="64px" quality={100} className="object-cover" loading="lazy" />
                          ) : (
                            <div className="w-full h-full bg-white/5 flex items-center justify-center text-xl font-black text-gray-400">{group.user.username.charAt(0)}</div>
                          )}
                        </div>
                      </Link>
                      <div>
                        <Link href={`/profile/${group.user.username}`} className={`font-black hover:underline transition-all text-lg sm:text-xl tracking-tight leading-none block mb-1.5 ${group.hasPlatinum ? 'text-cyan-50' : 'text-white'}`}>
                          {group.user.username}
                        </Link>
                        <span className={`text-[10px] sm:text-[11px] font-black uppercase tracking-widest ${group.hasPlatinum ? 'text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]' : 'text-gray-500'}`}>
                          {group.hasPlatinum ? '✨ Conquistou a Platina' : 'Progresso Recente'}
                        </span>
                      </div>
                    </div>

                    {/* DIREITA: Jogo e Plataforma */}
                    {/* DIREITA: Jogo e Plataforma */}
                    <div className="text-right flex flex-col items-end">
                      <Link href={`/games/${group.game_id}?back=${encodeURIComponent(currentPath)}`} className="group/game flex items-center gap-3 sm:gap-4 transition-all">
                        <div className="flex-col text-right hidden sm:flex">
                          <span className="text-white font-bold text-sm sm:text-base truncate max-w-35 sm:max-w-50 group-hover/game:text-primary transition-colors tracking-tight leading-tight drop-shadow-sm">
                            {group.game_name}
                          </span>
                          <div className="flex items-center justify-end gap-1.5 sm:gap-2 mt-1.5 text-[9px] sm:text-[10px] font-black text-gray-500 uppercase tracking-wider">
                            <PlatformIcon platform={group.platform} />
                            <span className="opacity-50">•</span>
                            <span>{timeAgo(group.date)}</span>
                          </div>
                        </div>

                        <div className="relative w-11 h-16.5 sm:w-13 sm:h-19.5 shrink-0">
                          <div className={`w-full h-full rounded-xl overflow-hidden border transition-all duration-500 ease-out transform transform-gpu group-hover/game:scale-110 group-hover/game:-translate-y-1 ${group.hasPlatinum ? 'border-white/10 group-hover/game:border-cyan-400 group-hover/game:shadow-[0_15px_30px_-5px_rgba(6,182,212,0.6)]' : 'border-white/10 group-hover/game:border-primary group-hover/game:shadow-[0_15px_30px_-5px_rgba(59,130,246,0.6)]'}`}>
                            {group.game?.cover_url ? (
                              <Image src={group.game.cover_url} alt="" fill sizes="52px" quality={100} className="object-cover rounded-xl" loading="lazy" />
                            ) : (
                              <div className="w-full h-full bg-white/5 rounded-xl"></div>
                            )}
                            <div className="absolute inset-0 bg-linear-to-tr from-transparent via-white/20 to-transparent opacity-0 group-hover/game:opacity-100 transition-opacity duration-700 pointer-events-none rounded-xl"></div>
                          </div>
                        </div>
                      </Link>
                    </div>
                  </div>

                  {/* LISTA DE CONQUISTAS */}
                  <div className="relative z-10 p-6 sm:p-8 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {visibleAchievements.map(ach => {
                      const isPlat = ach.achievement_icon === 'platinum_ps5';
                      // Tipagem blindada para a Trophy prop
                      const rarityType = (ach.rarity && ['bronze', 'silver', 'gold'].includes(ach.rarity)) ? ach.rarity as 'bronze' | 'silver' | 'gold' : null;

                      return (
                        <div key={ach.id} className={`flex items-center gap-4 p-3.5 pr-5 rounded-3xl border transition-all duration-300 backdrop-blur-md ${isPlat
                          ? 'bg-cyan-950/40 border-cyan-500/40 shadow-[inset_0_0_20px_rgba(6,182,212,0.1)] hover:bg-cyan-900/50'
                          : 'bg-[#0a0a0a]/40 border-white/5 hover:bg-white/10 hover:border-white/10'}`}>

                          <div className="shrink-0 relative w-14 h-14 flex items-center justify-center">
                            {isPlat ? (
                              <div className="w-full h-full flex items-center justify-center animate-pulse drop-shadow-[0_0_15px_rgba(6,182,212,0.8)] scale-110">
                                <Trophy type="platinum" className="w-12 h-12 object-contain" />
                              </div>
                            ) : ach.achievement_icon ? (
                              <div className="relative w-full h-full group/icon">
                                <div className="w-full h-full rounded-2xl overflow-hidden border border-white/10 bg-black/50 shadow-sm group-hover/icon:border-white/30 transition-all">
                                  {/* 🔥 quality={100} garante Ícone da Conquista nítido */}
                                  <Image src={ach.achievement_icon} alt="" fill sizes="56px" quality={100} loading="lazy" className="object-cover" />
                                </div>
                                {rarityType && (
                                  <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 drop-shadow-lg z-20 transform rotate-12 hover:scale-110 transition-transform">
                                    <Trophy type={rarityType} className="w-full h-full" />
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="w-full h-full bg-white/5 rounded-2xl flex items-center justify-center border border-white/5"><FaTrophy className="text-gray-600 text-xl" /></div>
                            )}
                          </div>

                          <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <p className={`font-bold truncate text-sm tracking-tight leading-tight mb-1.5 ${isPlat ? 'text-cyan-200 font-black drop-shadow-sm' : 'text-gray-200'}`}>
                              {ach.achievement_name}
                            </p>
                            {ach.points_earned > 0 && (
                              <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider w-fit shadow-sm ${isPlat ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/20' : 'bg-[#1a1a1a] text-yellow-500 border border-yellow-500/10'}`}>
                                <BiSolidCoinStack className="text-[11px]" /> +{ach.points_earned}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {hasMore && (
                      <div className="flex items-center justify-center gap-3 p-3 rounded-3xl border border-white/5 bg-[#0a0a0a]/40 hover:bg-white/10 backdrop-blur-md text-xs font-bold text-gray-400 uppercase tracking-widest h-full min-h-19 transition-all cursor-pointer group/more hover:border-white/20">
                        <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover/more:bg-white/10 transition-colors border border-white/5 group-hover/more:border-white/20 group-hover/more:scale-110">
                          <FaPlus className="text-gray-500 group-hover/more:text-white text-xs transition-colors" />
                        </div>
                        <span className="group-hover/more:text-white transition-colors">+{hiddenCount} Ocultas</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  );
}