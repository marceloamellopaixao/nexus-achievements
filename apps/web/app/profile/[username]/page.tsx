import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import SocialButtons from "./SocialButtons";
import { CommentInput } from "./CommentForm";
import MuralList from "./MuralList";
import { Metadata } from "next";
import ClientBackButton from "@/app/components/ClientBackButton";

// Ícones Modernos
import { GiPadlockOpen, GiCrossedSwords } from "react-icons/gi";
import { FaMedal, FaEdit, FaCommentDots, FaCalendarAlt, FaGamepad, FaTrophy } from "react-icons/fa";

export const metadata: Metadata = {
  title: "Perfil Público | Nexus Achievements",
  description: "Explore o perfil público de um caçador de troféus no Nexus Achievements.",
}

interface ProfilePageProps {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ back?: string }>;
}

type ShowcaseGame = { id: string; title: string; cover_url: string; };
interface ProfileComment { id: string; profile_id: string; author_id: string; content: string; created_at: string; author?: { id: string; username: string; avatar_url: string | null; }; }
interface RawCommentWithAuthor { id: string; profile_id: string; author_id: string; content: string; created_at: string; author: { id: string; username: string; avatar_url: string | null } | { id: string; username: string; avatar_url: string | null }[]; }
interface RawUserBadge { badge_id: string; awarded_at: string; badges: { name: string; icon: string; color_class: string; description: string; } | { name: string; icon: string; color_class: string; description: string; }[]; }
interface FormattedBadge { badge_id: string; awarded_at: string; name: string; icon: string; color_class: string; description: string; }

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

  const isOwner = authUser?.id === profile.id;
  const showcaseLimit = profile.showcase_limit || 5;

  const [{ count: followersCount }, { count: followingCount }, { data: badgesData }] = await Promise.all([
    supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('following_id', profile.id),
    supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('follower_id', profile.id),
    supabase.from('user_badges').select('badge_id, awarded_at, badges(name, icon, color_class, description)').eq('user_id', profile.id)
  ]);

  const badges: FormattedBadge[] = (badgesData as unknown as RawUserBadge[])?.map(ub => {
    const badgeDetails = Array.isArray(ub.badges) ? ub.badges[0] : ub.badges;
    return {
      badge_id: ub.badge_id,
      awarded_at: ub.awarded_at,
      name: badgeDetails?.name || 'Insígnia',
      icon: badgeDetails?.icon || '',
      color_class: badgeDetails?.color_class || 'text-gray-400',
      description: badgeDetails?.description || ''
    };
  }) || [];

  let isFollowing = false;
  if (authUser && !isOwner) {
    const { data } = await supabase.from('user_follows').select('follower_id').eq('follower_id', authUser.id).eq('following_id', profile.id).maybeSingle();
    if (data) isFollowing = true;
  }

  const { data: commentsRaw } = await supabase.from('profile_comments').select('*, author:users!author_id(id, username, avatar_url)').eq('profile_id', profile.id).order('created_at', { ascending: false });
  const comments: ProfileComment[] = (commentsRaw as unknown as RawCommentWithAuthor[])?.map(c => ({
    ...c, author: Array.isArray(c.author) ? c.author[0] : c.author
  })) || [];

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
  if (profile.showcase_games && profile.showcase_games.length > 0) {
    const { data: gamesData } = await supabase.from("games").select("id, title, cover_url").in("id", profile.showcase_games);
    if (gamesData) showcaseGames = profile.showcase_games.map((id: string) => gamesData.find(g => g.id === id)).filter(Boolean) as ShowcaseGame[];
  }

  const joinDate = new Date(profile.created_at).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });

  return (
    <div className="min-h-screen pb-20 animate-in fade-in duration-500 relative">

      <ClientBackButton href={backUrl} title={backTitle} />

      {/* BANNER */}
      <div className="-mx-4 md:-mx-8 -mt-4 md:-mt-8 h-56 md:h-72 lg:h-80 relative overflow-hidden border-b border-border/50 shadow-2xl rounded-b-4xl transition-all duration-700 z-0" style={{ background: styles.background || '#18181b' }}>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-linear-to-t from-background via-background/60 to-transparent" />
      </div>

      {/* NOVO CARTÃO PRINCIPAL (Tudo centralizado + 2 Colunas em baixo) */}
      <div className="max-w-5xl mx-auto -mt-24 md:-mt-32 relative z-10 px-4 md:px-0">
        <div className="bg-surface/80 backdrop-blur-2xl border border-white/10 rounded-4xl p-6 md:p-10 shadow-2xl relative">

          {/* FOTO NO MEIO (Posicionamento Absoluto) */}
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

          {/* CABEÇALHO DO PERFIL (Nome, Lvl, Título e Badges no Centro) */}
          <div className="pt-16 md:pt-20 pb-8 flex flex-col items-center text-center border-b border-white/5 gap-3">
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex flex-wrap items-center justify-center gap-3 drop-shadow-md">
              <span className="truncate max-w-full">{profile.username}</span>
              <span className="text-xs font-black bg-primary/20 text-primary border border-primary/50 px-2.5 py-1 rounded-lg uppercase tracking-wider shrink-0">
                Lvl {profile.global_level || 1}
              </span>
              {/* Barra de separação centralizada */}
              <span className="flex items-center justify-center w-px h-4 bg-white/20 mx-2"></span>
              {styles.titleStyle && styles.titleName ? (
                <span className="inline-block px-4 py-1.5 rounded-lg border border-white/20 text-sm font-black shadow-lg text-white" style={{ background: styles.titleStyle }}>{styles.titleName}</span>
              ) : (
                <p className="text-primary font-bold text-sm tracking-widest uppercase">{profile.title}</p>
              )}
            </h1>

            <div className="relative">
              <FaCommentDots className="absolute top-4 left-4 text-white/10 text-2xl" />
              <p className="text-gray-300 leading-relaxed text-sm bg-background/40 p-5 pl-12 rounded-2xl border border-white/5 shadow-inner italic text-center md:text-left">
                &quot;{profile.bio || "Este caçador prefere manter o mistério."}&quot;
              </p>
            </div>

            {/* Insígnias */}
            {badges.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2">
                {badges.map((ub) => {
                  const isNew = new Date(ub.awarded_at).getTime() > new Date().getTime() - 86400000;
                  return (
                    <div key={ub.badge_id} title={`${ub.name}: ${ub.description}`} className={`flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl cursor-help transition-all hover:bg-white/10 relative ${ub.color_class} ${isNew ? 'ring-2 ring-primary animate-pulse' : ''}`}>
                      <span className="text-base">{ub.icon || <FaMedal />}</span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/80">{ub.name}</span>
                      {isNew && <span className="absolute -top-1 -right-1 flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span></span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* AS DUAS COLUNAS INFERIORES */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-12 pt-8">

            {/* ESQUERDA: Biografia e Redes */}
            <div className="space-y-2 flex flex-col">
              <div className="flex flex-col items-center gap-1">
                {!isOwner && (
                  <Link href={`/chat/${profile.username}`} className="col-span-1 sm:col-span-2 w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-surface border border-white/10 text-white hover:bg-white/10 rounded-xl font-black text-sm transition-all shadow-sm active:scale-95">
                    <FaCommentDots className="text-lg" /> Mensagem Direta
                  </Link>
                )}
                <div className="flex items-center justify-center gap-4 bg-background/60 px-5 py-3.5 rounded-xl border border-white/5 w-full flex-1">
                  <Link href={`/profile/${profile.username}/network?tab=followers`} className="text-xs text-gray-400 font-bold uppercase tracking-wider hover:text-primary transition-colors text-center">
                    <strong className="text-white text-lg block sm:inline mr-1">{followersCount || 0}</strong> Seguidores
                  </Link>
                  <div className="w-px h-8 sm:h-4 bg-white/10"></div>
                  <Link href={`/profile/${profile.username}/network?tab=following`} className="text-xs text-gray-400 font-bold uppercase tracking-wider hover:text-primary transition-colors text-center">
                    <strong className="text-white text-lg block sm:inline mr-1">{followingCount || 0}</strong> Seguindo
                  </Link>
                </div>
                <span className="flex items-center justify-center gap-4 bg-background/60 px-5 py-3.5 rounded-xl border border-white/5 w-full flex-1 text-xs text-gray-400 font-bold uppercase tracking-wider">
                  <FaCalendarAlt className="text-sm" /> {joinDate}
                </span>
              </div>
            </div>

            {/* DIREITA: Estatísticas e Ações */}
            <div className="space-y-2 flex flex-col">
              {/* Botões */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {isOwner ? (
                  <Link href={`/profile/${profile.username}/studio`} className="col-span-1 sm:col-span-2 w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-black hover:bg-gray-200 rounded-xl font-black text-sm transition-all shadow-md active:scale-95">
                    <FaEdit className="text-lg" /> Editar Perfil
                  </Link>
                ) : (
                  <>
                    <div className="w-full">
                      <SocialButtons targetId={profile.id} initialIsFollowing={isFollowing} currentPath={currentPath} />
                    </div>
                    <Link href={`/compare/${profile.username}`} className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-primary/10 text-primary hover:bg-primary hover:text-white border border-primary/30 rounded-xl font-black text-sm transition-all shadow-sm active:scale-95">
                      <GiCrossedSwords className="text-lg" /> Comparar
                    </Link>
                  </>
                )}
              </div>
              {/* Box de Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center bg-background/60 border border-white/5 px-4 py-5 rounded-2xl shadow-inner">
                  <p className="text-3xl md:text-4xl font-black text-white truncate">{profile.total_games || 0}</p>
                  <p className="flex items-center justify-center gap-2 text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-widest">
                    <FaGamepad className="text-sm" /> Jogos
                  </p>
                </div>
                <div className="text-center bg-blue-500/10 border border-blue-500/20 px-4 py-5 rounded-2xl shadow-inner relative overflow-hidden">
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 pointer-events-none"></div>
                  <p className="text-3xl md:text-4xl font-black text-blue-400 relative z-10 truncate drop-shadow-md">
                    {profile.total_platinums || 0}
                  </p>
                  <p className="flex items-center justify-center gap-2 text-[10px] md:text-xs text-blue-500 font-bold uppercase tracking-widest relative z-10">
                    <FaTrophy className="text-sm" /> Platinas
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* SECÇÃO INFERIOR (Estante e Mural) */}
      <div className="max-w-5xl mx-auto px-4 md:px-0 mt-10 grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
        <div className="xl:col-span-2 space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h2 className="text-2xl font-black text-white flex items-center gap-3"><FaTrophy className="text-yellow-500" /> Estante de Troféus</h2>
            <span className="text-xs font-bold text-gray-400 bg-surface/50 px-3 py-1.5 rounded-lg border border-white/10">{showcaseGames.length} / {showcaseLimit} Slots</span>
          </div>

          {showcaseGames.length === 0 ? (
            <div className="h-64 bg-surface/20 rounded-3xl border border-dashed border-white/10 flex flex-col items-center justify-center text-center p-6 shadow-inner">
              <FaGamepad className="text-6xl mb-4 text-white/20 drop-shadow-md" />
              <h3 className="text-lg font-bold text-white mb-1">Estante Vazia</h3>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {showcaseGames.map((game) => (
                <Link
                  href={`/games/${game.id}?back=${encodeURIComponent(currentPath)}`}
                  key={game.id}
                  className="group relative aspect-3/4 rounded-2xl border border-white/10 bg-surface overflow-hidden hover:border-primary/50 transition-all shadow-lg hover:-translate-y-1"
                >
                  <Image src={game.cover_url} alt={game.title} fill className="object-cover group-hover:scale-105 transition-transform" unoptimized />
                </Link>
              ))}
              {Array.from({ length: Math.max(0, showcaseLimit - showcaseGames.length) }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-3/4 rounded-2xl border-2 border-dashed border-white/5 bg-surface/20 flex flex-col items-center justify-center gap-3 opacity-50">
                  <GiPadlockOpen className="text-3xl text-gray-600" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Slot Livre</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6 xl:sticky xl:top-24">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h2 className="text-2xl font-black text-white flex items-center gap-3"><FaCommentDots className="text-primary" /> Mural</h2>
          </div>
          <div className="bg-surface/30 backdrop-blur-xl border border-white/10 rounded-3xl p-5 flex flex-col shadow-2xl relative overflow-visible h-auto max-h-150">
            {authUser ? (
              <div className="mb-6 relative z-10">
                <CommentInput profileId={profile.id} currentPath={currentPath} />
              </div>
            ) : (
              <div className="mb-6 p-4 bg-background/80 rounded-2xl border border-white/5 text-center text-sm text-gray-400 font-bold shadow-inner">
                Inicie sessão para deixar um recado.
              </div>
            )}
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar relative z-10 overflow-visible">
              <MuralList initialComments={comments} profileId={profile.id} authUserId={authUser?.id} isOwner={isOwner} currentPath={currentPath} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}