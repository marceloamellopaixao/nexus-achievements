import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import SocialButtons from "./SocialButtons";
import { CommentInput } from "./CommentForm";
import MuralList from "./MuralList";
import { Metadata } from "next";
import ClientBackButton from "@/app/components/ClientBackButton";

import { GiCrossedSwords } from "react-icons/gi";
import { FaMedal, FaEdit, FaCommentDots, FaCalendarAlt, FaGamepad, FaTrophy, FaSteam, FaPlaystation, FaXbox } from "react-icons/fa";
import { SiEpicgames } from "react-icons/si";
import ShowcaseDraggable from "./ShowcaseDraggable";

export const metadata: Metadata = {
  title: "Perfil Público | Nexus Achievements",
  description: "Explore o perfil público de um caçador de troféus no Nexus Achievements.",
}

interface ProfilePageProps {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ back?: string }>;
}

type ShowcaseGame = { id: string; title: string; cover_url: string | null; total_achievements: number; console?: string | null; };

interface ProfileComment { id: string; profile_id: string; author_id: string; content: string; created_at: string; author?: { id: string; username: string; avatar_url: string | null; }; }
interface RawCommentWithAuthor { id: string; profile_id: string; author_id: string; content: string; created_at: string; author: { id: string; username: string; avatar_url: string | null } | { id: string; username: string; avatar_url: string | null }[]; }
interface RawUserBadge { badge_id: string; awarded_at: string; badges: { name: string; icon: string; color_class: string; description: string; } | { name: string; icon: string; color_class: string; description: string; }[]; }
interface FormattedBadge { badge_id: string; awarded_at: string; name: string; icon: string; color_class: string; description: string; }

interface PlatData {
  is_platinum: boolean;
  games: { platform: string } | { platform: string }[] | null;
}

export default async function PublicProfilePage({ params, searchParams }: ProfilePageProps) {
  const { username } = await params;
  const { back } = await searchParams;

  const currentPath = `/profile/${username}`;
  const supabase = await createClient();

  const backUrl = back ? back : '/social';
  let backTitle = "Voltar";
  if (backUrl.includes('/social')) backTitle = "Voltar à Comunidade";
  else if (backUrl.includes('/leaderboards')) backTitle = "Voltar ao Ranking";
  else if (backUrl.includes('/games')) backTitle = "Voltar aos Jogos";

  const { data: { user: authUser } } = await supabase.auth.getUser();
  const { data: profile, error } = await supabase.from("users").select("*").eq("username", username).single();

  if (error || !profile) notFound();

  // 🔥 IDENTIFICA SE O VISITANTE É O DONO DO PERFIL ANTES DE TUDO!
  const isOwner = authUser?.id === profile.id;

  // 1. RICH PRESENCE DA STEAM
  let playingNow: { title: string, platform: string } | null = null;
  const STEAM_KEY = process.env.STEAM_API_KEY;

  if (profile.steam_id && STEAM_KEY) {
    try {
      const res = await fetch(`http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${STEAM_KEY}&steamids=${profile.steam_id}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const pData = data?.response?.players?.[0];
        if (pData && pData.gameextrainfo) {
          playingNow = { title: pData.gameextrainfo, platform: 'Steam' };
        }
      }
    } catch (err) { console.error("Erro Rich Presence", err); }
  }

  // 2. BUSCA AS CONEXÕES MULTIPLATAFORMA
  const { data: linkedAccounts } = await supabase.from('linked_accounts').select('*').eq('user_id', profile.id);

  const connections = [];
  const linkedMap = new Map<string, string>();

  linkedAccounts?.forEach(acc => {
    linkedMap.set(acc.platform, acc.platform_username || acc.platform_user_id);
  });

  const steamDisplayName = linkedMap.get('Steam') || profile.steam_id;
  if (steamDisplayName) {
    connections.push({ platform: 'Steam', username: steamDisplayName, icon: <FaSteam className="text-sm shrink-0" />, color: 'text-blue-400 bg-blue-900/20 border-blue-500/30 hover:bg-blue-900/40' });
  }
  if (linkedMap.has('PlayStation')) {
    connections.push({ platform: 'PSN', username: linkedMap.get('PlayStation'), icon: <FaPlaystation className="text-sm shrink-0" />, color: 'text-blue-500 bg-blue-600/10 border-blue-600/30 hover:bg-blue-600/20' });
  }
  if (linkedMap.has('Xbox')) {
    connections.push({ platform: 'Xbox', username: linkedMap.get('Xbox'), icon: <FaXbox className="text-sm shrink-0" />, color: 'text-green-500 bg-green-500/10 border-green-500/30 hover:bg-green-500/20' });
  }
  if (linkedMap.has('Epic')) {
    connections.push({ platform: 'Epic', username: linkedMap.get('Epic'), icon: <SiEpicgames className="text-sm shrink-0" />, color: 'text-gray-300 bg-gray-500/10 border-gray-500/30 hover:bg-gray-500/20' });
  }

  // 3. 🔥 O VERDADEIRO NEXUS: AUTO-CURA (HEALING) E DIVISÃO DE PLATINAS
  const { data: allUserGamesRaw } = await supabase.from('user_games').select('is_platinum, games(platform)').eq('user_id', profile.id);
  const allUserGames = allUserGamesRaw as unknown as PlatData[];

  let realTotalPlatinums = 0;
  let realTotalGames = 0;
  let steamPlats = 0; let psPlats = 0; let xboxPlats = 0;

  if (allUserGames) {
    realTotalGames = allUserGames.length;

    allUserGames.forEach(ug => {
      if (ug.is_platinum) {
        realTotalPlatinums++;
        const plat = Array.isArray(ug.games) ? ug.games[0]?.platform : ug.games?.platform;
        if (plat === 'Steam') steamPlats++;
        else if (plat === 'PlayStation' || plat === 'PSN') psPlats++;
        else if (plat === 'Xbox') xboxPlats++;
      }
    });

    if (profile.total_platinums !== realTotalPlatinums || profile.total_games !== realTotalGames) {
      // 1. Atualiza na interface visual para QUALQUER PESSOA ver o número certo na hora
      profile.total_platinums = realTotalPlatinums;
      profile.total_games = realTotalGames;

      // 2. Tenta corrigir no Banco de Dados APENAS se for o dono (Para não violar as Policies de Segurança!)
      if (isOwner) {
        await supabase.from('users').update({
          total_platinums: realTotalPlatinums,
          total_games: realTotalGames
        }).eq('id', profile.id);
      }
    }
  }

  const showcaseLimit = profile.showcase_limit || 5;

  const [{ count: followersCount }, { count: followingCount }, { data: badgesData }] = await Promise.all([
    supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('following_id', profile.id),
    supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('follower_id', profile.id),
    supabase.from('user_badges').select('badge_id, awarded_at, badges(name, icon, color_class, description)').eq('user_id', profile.id)
  ]);

  const badges: FormattedBadge[] = (badgesData as unknown as RawUserBadge[])?.map(ub => {
    const badgeDetails = Array.isArray(ub.badges) ? ub.badges[0] : ub.badges;
    return { badge_id: ub.badge_id, awarded_at: ub.awarded_at, name: badgeDetails?.name || 'Insígnia', icon: badgeDetails?.icon || '', color_class: badgeDetails?.color_class || 'text-gray-400', description: badgeDetails?.description || '' };
  }) || [];

  let isFollowing = false;
  if (authUser && !isOwner) {
    const { data } = await supabase.from('user_follows').select('follower_id').eq('follower_id', authUser.id).eq('following_id', profile.id).maybeSingle();
    if (data) isFollowing = true;
  }

  const { data: commentsRaw } = await supabase.from('profile_comments').select('*, author:users!author_id(id, username, avatar_url)').eq('profile_id', profile.id).order('created_at', { ascending: false });
  const comments: ProfileComment[] = (commentsRaw as unknown as RawCommentWithAuthor[])?.map(c => ({ ...c, author: Array.isArray(c.author) ? c.author[0] : c.author })) || [];

  const equippedIds = [profile.equipped_background, profile.equipped_border, profile.equipped_title].filter(Boolean);
  const styles = { background: '', border: '', titleStyle: '', titleName: '' };

  if (equippedIds.length > 0) {
    const { data: shopItems } = await supabase.from("shop_items").select("*").in("id", equippedIds);
    if (shopItems) {
      styles.background = shopItems.find(i => i.id === profile.equipped_background)?.gradient || '';
      styles.border = shopItems.find(i => i.id === profile.equipped_border)?.border_style || '';
      const t = shopItems.find(i => i.id === profile.equipped_title);
      styles.titleStyle = t?.tag_style || '';
      styles.titleName = t?.name || '';
    }
  }

  let showcaseGames: ShowcaseGame[] = [];
  const userProgressMap: Record<string, { unlocked: number, is_platinum: boolean, playtime_minutes: number }> = {};

  if (profile.showcase_games && profile.showcase_games.length > 0) {
    const { data: gamesData } = await supabase.from("games").select("id, title, cover_url, total_achievements, console").in("id", profile.showcase_games);

    if (gamesData) {
      showcaseGames = profile.showcase_games
        .map((id: string) => gamesData.find(g => g.id === id))
        .filter(Boolean) as ShowcaseGame[];
    }

    const { data: progressData } = await supabase.from('user_games').select('game_id, unlocked_achievements, is_platinum, playtime_minutes').eq('user_id', profile.id).in('game_id', profile.showcase_games);

    progressData?.forEach(p => {
      userProgressMap[p.game_id] = { unlocked: p.unlocked_achievements, is_platinum: p.is_platinum, playtime_minutes: p.playtime_minutes };
    });
  }

  const joinDate = new Date(profile.created_at).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });

  return (
    <div className="min-h-screen pb-20 animate-in fade-in duration-500 relative">

      <ClientBackButton href={backUrl} title={backTitle} />

      <div className="-mx-4 md:-mx-8 -mt-4 md:-mt-8 h-56 md:h-72 lg:h-80 relative overflow-hidden border-b border-white/5 shadow-2xl rounded-b-4xl transition-all duration-700 z-0 bg-background">
        {profile.profile_banner_url && (
          <Image src={profile.profile_banner_url} alt="Banner" fill className="object-cover opacity-70 mix-blend-lighten" unoptimized />
        )}
        <div className="absolute inset-0" style={styles.background ? { background: styles.background, opacity: profile.profile_banner_url ? 0.6 : 1 } : { background: '#18181b', opacity: profile.profile_banner_url ? 0.8 : 1 }}></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 mix-blend-overlay pointer-events-none"></div>
        <div className="absolute inset-0 bg-linear-to-t from-background via-background/60 to-transparent pointer-events-none" />
      </div>

      <div className="max-w-5xl mx-auto -mt-24 md:-mt-32 relative z-10 px-2 sm:px-4 md:px-0">
        <div className="bg-surface/80 backdrop-blur-2xl border border-white/10 rounded-4xl p-4 sm:p-6 md:p-10 shadow-2xl relative w-full min-w-0">

          <div className="absolute left-1/2 -translate-x-1/2 -top-16 md:-top-20 w-32 h-32 md:w-40 md:h-40 z-20">
            <div className="absolute inset-0 rounded-4xl p-1 shadow-2xl transition-all duration-700" style={{ background: styles.border || 'transparent' }}>
              <div className="w-full h-full rounded-[1.75rem] bg-background overflow-hidden relative flex items-center justify-center">
                {profile.avatar_url ? (
                  <Image src={profile.avatar_url} alt={profile.username} fill className="object-cover" unoptimized />
                ) : (
                  <span className="text-5xl font-black text-white">{profile.username.charAt(0).toUpperCase()}</span>
                )}
              </div>
            </div>
          </div>

          <div className="pt-16 md:pt-20 pb-6 md:pb-8 flex flex-col items-center text-center border-b border-white/5 gap-3 w-full min-w-0">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 w-full min-w-0 px-2">
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight truncate max-w-full drop-shadow-md">
                {profile.username}
              </h1>
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <span className="text-[10px] md:text-xs font-black bg-primary/20 text-primary border border-primary/50 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                  Lvl {profile.global_level || 1}
                </span>
                <span className="hidden sm:block w-px h-4 bg-white/20"></span>
                {styles.titleStyle && styles.titleName ? (
                  <span className="inline-block px-3 py-1.5 rounded-lg border border-white/20 text-[10px] sm:text-xs font-black shadow-lg text-white truncate max-w-30 sm:max-w-full" style={{ background: styles.titleStyle }}>
                    {styles.titleName}
                  </span>
                ) : (
                  <p className="text-primary font-bold text-[10px] sm:text-xs tracking-widest uppercase truncate max-w-30 sm:max-w-full">{profile.title}</p>
                )}
              </div>
            </div>

            {playingNow && (
              <div className="flex items-center justify-center mt-1 mb-1 animate-in fade-in zoom-in duration-500 px-2 w-full">
                <span className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-1.5 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-widest shadow-[0_0_15px_rgba(34,197,94,0.15)] max-w-full">
                  {playingNow.platform === 'Steam' ? <FaSteam className="text-sm md:text-base shrink-0" /> : <FaGamepad className="text-sm md:text-base shrink-0" />}
                  <span className="truncate">Jogando: {playingNow.title}</span>
                </span>
              </div>
            )}

            <div className="relative w-full max-w-lg mx-auto mt-2 px-2">
              <FaCommentDots className="absolute top-5 left-6 text-white/10 text-xl sm:text-2xl" />
              <p className="text-gray-300 leading-relaxed text-xs sm:text-sm bg-background/40 p-4 sm:p-5 pl-10 sm:pl-12 rounded-2xl border border-white/5 shadow-inner italic text-center sm:text-left wrap-break-words w-full">
                &quot;{profile.bio || "Este caçador prefere manter o mistério."}&quot;
              </p>
            </div>

            {connections.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mt-4 px-2 animate-in fade-in">
                {connections.map(c => (
                  <div key={c.platform} title={`${c.platform}: ${c.username}`} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-black text-[10px] uppercase tracking-widest transition-all cursor-help shadow-sm ${c.color} max-w-full`}>
                    {c.icon} <span className="truncate">{c.username}</span>
                  </div>
                ))}
              </div>
            )}

            {badges.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mt-2 px-2">
                {badges.map((ub) => {
                  const isNew = new Date(ub.awarded_at).getTime() > new Date().getTime() - 86400000;
                  return (
                    <div key={ub.badge_id} title={`${ub.name}: ${ub.description}`} className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl cursor-help transition-all hover:bg-white/10 relative ${ub.color_class} ${isNew ? 'ring-2 ring-primary animate-pulse' : ''}`}>
                      <span className="text-xs sm:text-sm">{ub.icon || <FaMedal />}</span>
                      <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-white/80 whitespace-nowrap">{ub.name}</span>
                      {isNew && <span className="absolute -top-1 -right-1 flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span></span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-12 pt-6 w-full">
            <div className="flex flex-col gap-3 w-full min-w-0">
              {!isOwner && (
                <Link href={`/chat/${profile.username}`} className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-surface border border-white/10 text-white hover:bg-white/10 rounded-xl font-black text-sm transition-all shadow-sm active:scale-95">
                  <FaCommentDots className="text-lg shrink-0" /> <span className="truncate">Mensagem Direta</span>
                </Link>
              )}
              <div className="flex items-center justify-center gap-2 sm:gap-4 bg-background/60 px-3 py-3.5 rounded-xl border border-white/5 w-full">
                <Link href={`/profile/${profile.username}/network?tab=followers`} className="flex-1 min-w-0 flex flex-col items-center hover:text-primary transition-colors">
                  <strong className="text-white text-base md:text-lg block mb-0.5 truncate">{followersCount || 0}</strong>
                  <span className="text-[10px] sm:text-xs text-gray-400 font-bold uppercase tracking-wider truncate max-w-full">Seguidores</span>
                </Link>
                <div className="w-px h-8 bg-white/10 shrink-0"></div>
                <Link href={`/profile/${profile.username}/network?tab=following`} className="flex-1 min-w-0 flex flex-col items-center hover:text-primary transition-colors">
                  <strong className="text-white text-base md:text-lg block mb-0.5 truncate">{followingCount || 0}</strong>
                  <span className="text-[10px] sm:text-xs text-gray-400 font-bold uppercase tracking-wider truncate max-w-full">Seguindo</span>
                </Link>
              </div>
              <div className="flex items-center justify-center gap-2 bg-background/60 px-4 py-3.5 rounded-xl border border-white/5 w-full">
                <FaCalendarAlt className="text-sm shrink-0 text-gray-400" />
                <span className="text-[10px] sm:text-xs text-gray-400 font-bold uppercase tracking-wider truncate">
                  {joinDate}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-3 w-full min-w-0">
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                {isOwner ? (
                  <Link href={`/profile/${profile.username}/studio`} className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-black hover:bg-gray-200 rounded-xl font-black text-sm transition-all shadow-md active:scale-95">
                    <FaEdit className="text-lg shrink-0" /> <span className="truncate">Editar Perfil</span>
                  </Link>
                ) : (
                  <>
                    <div className="w-full min-w-0">
                      <SocialButtons targetId={profile.id} initialIsFollowing={isFollowing} currentPath={currentPath} />
                    </div>
                    <Link href={`/compare/${profile.username}`} className="w-full flex items-center justify-center gap-2 px-4 py-3.5 bg-primary/10 text-primary hover:bg-primary hover:text-white border border-primary/30 rounded-xl font-black text-sm transition-all shadow-sm active:scale-95 min-w-0">
                      <GiCrossedSwords className="text-lg shrink-0" /> <span className="truncate">Comparar</span>
                    </Link>
                  </>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 w-full">
                <div className="flex flex-col justify-center items-center text-center bg-background/60 border border-white/5 px-2 py-4 rounded-2xl shadow-inner min-w-0">
                  <p className="text-2xl sm:text-3xl font-black text-white truncate">{profile.total_games || 0}</p>
                  <p className="flex items-center justify-center gap-1.5 text-[9px] sm:text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                    <FaGamepad className="text-xs shrink-0" /> <span className="truncate">Jogos</span>
                  </p>
                </div>

                <div className="text-center bg-blue-500/10 border border-blue-500/20 px-2 py-4 rounded-2xl shadow-inner relative min-w-0 flex flex-col justify-center">
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 pointer-events-none"></div>

                  <p className="text-2xl sm:text-3xl font-black text-blue-400 relative z-10 truncate drop-shadow-md">
                    {profile.total_platinums || 0}
                  </p>
                  <p className="flex items-center justify-center gap-1.5 text-[9px] sm:text-[10px] text-blue-500 font-bold uppercase tracking-widest relative z-10 mt-1">
                    <FaTrophy className="text-xs shrink-0" /> <span className="truncate">Platinas</span>
                  </p>

                  {(steamPlats > 0 || psPlats > 0 || xboxPlats > 0) && (
                    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 mt-2 relative z-10 border-t border-blue-500/20 pt-2 w-4/5 mx-auto">
                      {steamPlats > 0 && <span className="text-[9px] font-black text-blue-300 flex items-center gap-1 opacity-80" title="Steam"><FaSteam /> {steamPlats}</span>}
                      {psPlats > 0 && <span className="text-[9px] font-black text-blue-300 flex items-center gap-1 opacity-80" title="PlayStation"><FaPlaystation /> {psPlats}</span>}
                      {xboxPlats > 0 && <span className="text-[9px] font-bold text-blue-300 flex items-center gap-1 opacity-80" title="Xbox"><FaXbox /> {xboxPlats}</span>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-0 mt-8 md:mt-10 grid grid-cols-1 xl:grid-cols-2 gap-2 md:gap-4 items-start">
        <div className="xl:col-span-2 space-y-4 w-full min-w-0">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-white/10 pb-3 gap-2">
            <h2 className="text-lg sm:text-xl md:text-2xl font-black text-white flex items-center gap-2 truncate w-full">
              <FaTrophy className="text-yellow-500 shrink-0" /> <span className="truncate">Estante de Troféus</span>
            </h2>
            <span className="text-[10px] sm:text-xs font-bold text-gray-400 bg-surface/50 px-2.5 py-1 rounded-lg border border-white/10 shrink-0 whitespace-nowrap">
              {showcaseGames.length} / {showcaseLimit} Slots
            </span>
          </div>

          {showcaseGames.length === 0 ? (
            <div className="h-48 md:h-64 bg-surface/20 rounded-3xl border border-dashed border-white/10 flex flex-col items-center justify-center text-center p-6 shadow-inner w-full">
              <FaGamepad className="text-5xl md:text-6xl mb-4 text-white/20 drop-shadow-md" />
              <h3 className="text-sm sm:text-base md:text-lg font-bold text-white mb-1">Estante Vazia</h3>
            </div>
          ) : (
            <ShowcaseDraggable 
              initialGames={showcaseGames} 
              userProgressMap={userProgressMap} 
              isOwner={isOwner} 
              userId={profile.id} 
              showcaseLimit={showcaseLimit} 
              backUrl={currentPath} 
            />
          )}
        </div>

        <div className="space-y-4 xl:sticky xl:top-24 w-full min-w-0">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h2 className="text-lg sm:text-xl md:text-2xl font-black text-white flex items-center gap-2 truncate">
              <FaCommentDots className="text-primary shrink-0" /> <span className="truncate">Mural</span>
            </h2>
          </div>

          <div className="bg-surface/30 backdrop-blur-xl border border-white/10 rounded-3xl p-4 flex flex-col shadow-2xl relative w-full max-h-125 md:max-h-150 mb-18 md:mb-6">
            <div className="shrink-0 w-full z-10">
              {authUser ? (
                <CommentInput profileId={profile.id} currentPath={currentPath} />
              ) : (
                <div className="p-4 bg-background/80 rounded-2xl border border-white/5 text-center text-xs md:text-sm text-gray-400 font-bold shadow-inner w-full">
                  Inicie sessão para deixar um recado.
                </div>
              )}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto pr-1 md:pr-2 custom-scrollbar relative z-0 w-full">
              <MuralList initialComments={comments} profileId={profile.id} authUserId={authUser?.id} isOwner={isOwner} currentPath={currentPath} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}