import React from "react";
import { createClient } from "@/utils/supabase/server";
import Image from "next/image";
import Link from "next/link";
import AutoSync from "../components/AutoSync";
import Trophy from "../components/Trophy";
import { FaArrowRight, FaSteam, FaUsers, FaMoon, FaTrophy } from "react-icons/fa"; // Corrigido FaTrophy e removido FaSyncAlt
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

export default async function SocialPage({ searchParams }: SocialPageProps) {
  const { feed } = await searchParams;
  const currentPath = `/social`; // Mantido para uso nos links de retorno
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
      const { data } = await supabase.from("global_activity").select(querySelect).in('user_id', followingIds).order("created_at", { ascending: false }).limit(100);
      activities = data as unknown as GlobalActivity[] || [];
    } else {
      isFollowingNoOne = true;
    }
  } else {
    const { data } = await supabase.from("global_activity").select(querySelect).order("created_at", { ascending: false }).limit(100);
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
      group = {
        key: groupKey, user: activityUser, game_id: activity.game_id, game_name: activity.game_name, game: gameData, platform: activity.platform, date: activity.created_at, achievements: [], hasPlatinum: false
      };
      groupedActivities.push(group);
    }

    if (activity.achievement_name.includes('PLATINOU')) {
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
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto pb-20 px-2 md:px-0 mt-4">
      <AutoSync />

      {/* TABS DE NAVEGAÇÃO */}
      <div className="flex flex-col sm:flex-row items-center justify-between bg-surface/60 backdrop-blur-xl border border-white/5 p-3 md:p-4 rounded-4xl shadow-2xl gap-4">
        <div className="flex bg-background/50 p-1.5 rounded-2xl w-full sm:w-auto">
          <Link href="/social?feed=global" className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-xs md:text-sm font-black transition-all text-center ${activeFeed === 'global' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-500 hover:text-white'}`}>
            GLOBAL
          </Link>
          <Link href="/social?feed=following" className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-xs md:text-sm font-black transition-all text-center ${activeFeed === 'following' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-gray-500 hover:text-white'}`}>
            AMIGOS
          </Link>
        </div>
        
        <Link href="/integrations" className="group flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 rounded-2xl text-xs font-black transition-all w-full sm:w-auto justify-center">
          <IoSettingsSharp className="text-lg group-hover:rotate-90 transition-transform" />
          SINCRONIZAR
        </Link>
      </div>

      {/* FEED DE ATIVIDADES */}
      <div className="space-y-8">
        {isFollowingNoOne ? (
          <div className="bg-surface/20 border border-white/5 border-dashed rounded-[2.5rem] py-20 text-center flex flex-col items-center">
            <FaUsers className="text-5xl text-white/10 mb-4" />
            <p className="text-gray-400 font-bold tracking-tight">O seu feed de amigos está deserto.</p>
            <Link href="/leaderboards" className="mt-6 flex items-center gap-2 bg-primary/10 text-primary px-6 py-3 rounded-2xl font-black text-sm hover:bg-primary hover:text-white transition-all">
              Encontrar Caçadores <FaArrowRight />
            </Link>
          </div>
        ) : groupedActivities.length === 0 ? (
          <div className="bg-surface/20 border border-white/5 border-dashed rounded-[2.5rem] py-20 text-center flex flex-col items-center">
            <FaMoon className="text-5xl text-white/10 mb-4" />
            <p className="text-gray-400 font-bold">Nenhuma atividade recente detectada.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-10">
            {groupedActivities.map((group) => (
              <div key={group.key} className={`group relative flex flex-col rounded-[2.5rem] border transition-all duration-500 overflow-hidden shadow-2xl ${group.hasPlatinum
                ? 'border-cyan-500/50 bg-linear-to-b from-[#0f172a] to-background shadow-[0_0_40px_rgba(6,182,212,0.1)]'
                : 'border-white/5 bg-surface/30 hover:border-white/10'
                }`}>

                {/* HEADER DO CARD COM BANNER */}
                <div className="relative p-6 md:p-8 flex items-center justify-between z-10 overflow-hidden min-h-30">
                  {group.game?.banner_url && (
                    <div className="absolute inset-0 z-0">
                      <Image src={group.game.banner_url} alt="" fill className="object-cover opacity-30 group-hover:scale-105 transition-transform duration-700" unoptimized />
                      <div className="absolute inset-0 bg-linear-to-r from-background via-background/90 to-transparent"></div>
                    </div>
                  )}

                  <div className="relative z-10 flex items-center gap-5 w-full">
                    <Link href={`/profile/${group.user.username}`} className="relative shrink-0">
                      <div className={`w-16 h-16 rounded-2xl overflow-hidden border-2 transition-all duration-500 ${group.hasPlatinum ? 'border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.4)] rotate-3' : 'border-white/10 group-hover:border-white/30'}`}>
                        {group.user.avatar_url ? (
                          <Image src={group.user.avatar_url} alt={group.user.username} fill className="object-cover" unoptimized />
                        ) : (
                          <div className="w-full h-full bg-primary/20 flex items-center justify-center text-xl font-black text-primary">{group.user.username.charAt(0)}</div>
                        )}
                      </div>
                    </Link>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/profile/${group.user.username}`} className="font-black text-white hover:text-primary transition-colors text-xl tracking-tighter">
                          {group.user.username}
                        </Link>
                        <span className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] bg-white/5 px-2 py-0.5 rounded-md">
                          Conquista
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/5 max-w-fit">
                          {group.game?.cover_url && (
                            <Image src={group.game.cover_url} alt="" width={20} height={20} className="rounded-xs object-cover" unoptimized />
                          )}
                          <FaSteam className="text-gray-400 text-sm" />
                          <Link href={`/games/${group.game_id}?back=${encodeURIComponent(currentPath)}`} className="text-white font-black text-xs md:text-sm truncate max-w-37.5 md:max-w-62.5 hover:text-primary transition-colors uppercase tracking-tight">
                            {group.game_name}
                          </Link>
                        </div>
                        <span className="text-[10px] font-black text-gray-500 uppercase shrink-0">{timeAgo(group.date)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* LISTA DE CONQUISTAS */}
                <div className="p-4 md:p-8 pt-2 grid grid-cols-1 md:grid-cols-2 gap-4 z-10 relative">
                  {group.achievements.map(ach => {
                    const isPlat = ach.achievement_icon === 'platinum_ps5';

                    return (
                      <div key={ach.id} className={`flex items-center gap-4 p-4 rounded-3xl border transition-all duration-300 ${isPlat 
                        ? 'bg-cyan-500/10 border-cyan-500/30 shadow-[inset_0_0_20px_rgba(6,182,212,0.1)]' 
                        : 'bg-background/40 border-white/5 hover:border-white/10 hover:bg-background/60'}`}>

                        <div className="shrink-0 relative w-14 h-14 flex items-center justify-center">
                          {isPlat ? (
                            <div className="w-full h-full flex items-center justify-center animate-pulse drop-shadow-[0_0_15px_rgba(6,182,212,0.6)]">
                              <Trophy type="platinum" className="w-12 h-12 object-contain" />
                            </div>
                          ) : ach.achievement_icon ? (
                            <div className="relative w-full h-full">
                              <div className="w-full h-full rounded-2xl overflow-hidden border border-white/10 shadow-xl">
                                <Image src={ach.achievement_icon} alt="" width={56} height={56} className="w-full h-full object-cover" unoptimized />
                              </div>
                              {ach.rarity && (
                                <div className="absolute -bottom-1 -right-1 w-6 h-6 drop-shadow-2xl z-20">
                                  <Trophy type={ach.rarity as 'bronze' | 'silver' | 'gold'} className="w-full h-full" />
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="w-full h-full bg-surface rounded-2xl flex items-center justify-center border border-white/5">
                              <FaTrophy className="text-xl text-gray-600" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className={`font-black truncate text-sm md:text-base tracking-tight mb-1 ${isPlat ? 'text-cyan-400' : 'text-gray-100'}`}>
                            {ach.achievement_name}
                          </p>
                          <div className="flex items-center gap-2">
                            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${isPlat ? 'bg-cyan-500/20 text-cyan-400' : 'bg-yellow-500/10 text-yellow-500'}`}>
                              <BiSolidCoinStack className="text-xs" />
                              +{ach.points_earned}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}