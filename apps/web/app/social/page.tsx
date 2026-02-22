import React from "react";
import { createClient } from "@/utils/supabase/server";
import Image from "next/image";
import Link from "next/link";
import AutoSync from "../components/AutoSync";
import Trophy from "../components/Trophy";
import { FaSteam } from "react-icons/fa";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Social | Nexus Achievements",
  description: "Acompanhe suas conquistas recentes, compare seu progresso com amigos e explore o feed de atividades da comunidade no Social do Nexus Achievements. Mantenha-se atualizado sobre seus jogos favoritos e inspire-se com as conquistas dos outros jogadores.",
}

interface SocialPageProps { searchParams: Promise<{ feed?: string }>; }

type GlobalActivity = {
  id: string; user_id: string; game_id: string | null; game_name: string; achievement_name: string; achievement_icon: string | null; rarity: string | null; points_earned: number; platform: string; created_at: string;
  users: { username: string; avatar_url: string | null; } | null;
  games: { banner_url: string | null; cover_url: string | null; } | null;
};

export default async function SocialPage({ searchParams }: SocialPageProps) {
  const { feed } = await searchParams;
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
        key: groupKey,
        user: activityUser,
        game_id: activity.game_id,
        game_name: activity.game_name,
        game: gameData,
        platform: activity.platform,
        date: activity.created_at,
        achievements: [],
        hasPlatinum: false
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

    if (diffInSeconds < 60) return "Hoje";
    if (diffInSeconds < 86400) return "Hoje";
    if (diffInSeconds < 172800) return "Ontem";
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto pb-10 px-4 md:px-0 mt-4">
      <AutoSync />

      <div className="flex flex-col sm:flex-row items-center justify-between bg-surface/40 backdrop-blur-md border border-border p-4 md:p-6 rounded-3xl shadow-lg">
        <div className="flex gap-4">
          <Link href="/social?feed=global" className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${activeFeed === 'global' ? 'bg-primary text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]' : 'bg-transparent text-gray-400 hover:text-white hover:bg-white/5'}`}>
            Feed Global
          </Link>
          <Link href="/social?feed=following" className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${activeFeed === 'following' ? 'bg-primary text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]' : 'bg-transparent text-gray-400 hover:text-white hover:bg-white/5'}`}>
            Feed de Amigos
          </Link>
        </div>
        <Link href="/integrations" className="mt-4 sm:mt-0 flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 rounded-full text-sm font-bold transition-all">
          <span>⚙️</span> Sincronizar Progresso
        </Link>
      </div>

      <div className="space-y-6 pt-2">
        {isFollowingNoOne ? (
          <div className="bg-surface/20 border border-border border-dashed rounded-3xl p-12 text-center">
            <span className="text-4xl opacity-50 mb-3 block">👥</span>
            <p className="text-gray-400 font-medium">O seu feed pessoal está vazio.</p>
            <Link href="/leaderboards" className="mt-4 inline-block text-primary hover:text-blue-400 font-bold text-sm">Explorar Hall da Fama →</Link>
          </div>
        ) : groupedActivities.length === 0 ? (
          <div className="bg-surface/20 border border-border border-dashed rounded-3xl p-12 text-center">
            <span className="text-4xl opacity-50 mb-3 block">💤</span>
            <p className="text-gray-400 font-medium">Nenhum troféu desbloqueado recentemente.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {groupedActivities.map((group) => (
              <div key={group.key} className={`relative flex flex-col rounded-3xl border transition-all duration-300 overflow-hidden shadow-lg ${
                group.hasPlatinum 
                ? 'bg-linear-to-b from-[#0f172a] to-[#0a0a0a] border-cyan-500/40 shadow-[0_0_30px_rgba(6,182,212,0.15)]' 
                : 'bg-[#12141a] border-white/5 hover:border-white/10'
              }`}>
                
                <div className="relative p-5 md:p-6 border-b border-white/5 flex items-center justify-between z-10 overflow-hidden min-h-30">
                  {group.game?.banner_url && (
                    <div className="absolute inset-0 z-0">
                      <Image src={group.game.banner_url} alt={group.game_name} fill className="object-cover opacity-20 md:opacity-30 mix-blend-screen" unoptimized />
                      <div className="absolute inset-0 bg-linear-to-r from-[#12141a] via-[#12141a]/80 to-transparent"></div>
                    </div>
                  )}

                  <div className="relative z-10 flex items-center gap-4 w-full">
                    <Link href={`/profile/${group.user.username}`} className="relative shrink-0">
                      <div className={`w-14 h-14 rounded-full overflow-hidden border-2 shadow-lg ${group.hasPlatinum ? 'border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]' : 'border-border/80'}`}>
                        {group.user.avatar_url ? (
                          <Image src={group.user.avatar_url} alt={group.user.username} fill className="object-cover" unoptimized />
                        ) : (
                          <div className="w-full h-full bg-surface flex items-center justify-center text-sm font-bold uppercase text-gray-400">{group.user.username.charAt(0)}</div>
                        )}
                      </div>
                    </Link>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Link href={`/profile/${group.user.username}`} className="font-bold text-white hover:text-primary transition-colors text-lg">
                          {group.user.username}
                        </Link>
                        <span className="text-gray-400 text-xs hidden sm:inline uppercase tracking-widest font-bold">desbloqueou em</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {group.game?.cover_url ? (
                          <Image src={group.game.cover_url} alt={group.game_name} width={32} height={32} className="w-8 h-8 rounded-sm object-cover" unoptimized />
                        ) : (
                          <div className="w-8 h-8 bg-surface/40 rounded-sm border border-white/10"></div>
                        )}
                        
                        {/* 2. FASTEAM DA REACT-ICONS APLICADO AQUI */}
                        <FaSteam className="text-gray-300 text-lg drop-shadow-sm shrink-0" />
                        
                        <span className="text-white font-black text-sm md:text-base tracking-wide drop-shadow-md truncate">{group.game_name}</span>
                        <span className="text-gray-500 text-xs mx-1 hidden sm:inline">•</span>
                        <span className="text-gray-400 text-xs font-bold capitalize hidden sm:inline">{timeAgo(group.date)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-5 md:p-6 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 z-10 relative">
                  {group.achievements.map(ach => {
                    const isPlat = ach.achievement_icon === 'platinum_ps5';
                    
                    return (
                      <div key={ach.id} className={`flex items-center gap-4 p-3 rounded-2xl border transition-all hover:scale-[1.02] ${isPlat ? 'bg-cyan-950/40 border-cyan-500/40 shadow-inner' : 'bg-surface/40 border-white/5 hover:border-white/10'}`}>
                        
                        <div className="shrink-0 relative w-12 h-12 flex items-center justify-center">
                          {isPlat ? (
                            <div className="w-full h-full flex items-center justify-center animate-pulse drop-shadow-[0_0_15px_rgba(6,182,212,0.8)]">
                              <Trophy type="platinum" className="w-10 h-10 object-contain" />
                            </div>
                          ) : ach.achievement_icon ? (
                            <>
                              <div className="w-full h-full rounded-xl overflow-hidden border border-white/10 shadow-md">
                                <Image src={ach.achievement_icon} alt="Icone da Conquista" width={48} height={48} className="w-full h-full object-cover" unoptimized />
                              </div>
                              {/* 3. CORREÇÃO DA RARIDADE: AGORA MOSTRA BRONZE, PRATA E OURO! */}
                              {ach.rarity && (
                                <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 drop-shadow-[0_2px_5px_rgba(0,0,0,0.9)] z-20">
                                  <Trophy type={ach.rarity as 'bronze' | 'silver' | 'gold'} className="w-full h-full" />
                                </div>
                              )}
                            </>
                          ) : (
                            <span className="text-2xl">🏆</span>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className={`font-bold truncate text-sm mb-0.5 ${isPlat ? 'text-transparent bg-clip-text bg-linear-to-r from-cyan-100 to-cyan-400' : 'text-gray-200'}`}>
                            {ach.achievement_name}
                          </p>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] grayscale opacity-70">🪙</span>
                            <span className={`text-xs font-bold ${isPlat ? 'text-cyan-500/80' : 'text-gray-500'}`}>+{ach.points_earned} Nexus Coins</span>
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