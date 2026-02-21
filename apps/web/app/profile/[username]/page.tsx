import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import SocialButtons from "./SocialButtons";
import { CommentInput, DeleteCommentButton } from "./CommentForm";

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

type ShowcaseGame = {
  id: string;
  title: string;
  cover_url: string;
};

interface ProfileComment {
  id: string;
  profile_id: string;
  author_id: string;
  content: string;
  created_at: string;
  author?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
}

// INTERFACES PARA INSÍGNIAS (Correção do erro TS2345)
interface RawUserBadge {
  badge_id: string;
  awarded_at: string;
  badges: {
    name: string;
    icon: string;
    color_class: string;
    description: string;
  } | {
    name: string;
    icon: string;
    color_class: string;
    description: string;
  }[];
}

interface FormattedBadge {
  badge_id: string;
  awarded_at: string;
  name: string;
  icon: string;
  color_class: string;
  description: string;
}

const timeAgo = (dateString: string) => {
  const date = new Date(dateString);
  const diff = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (diff < 60) return "Agora mesmo";
  if (diff < 3600) return `Há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Há ${Math.floor(diff / 3600)}h`;
  return `Há ${Math.floor(diff / 86400)} dias`;
};

export default async function PublicProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;
  const currentPath = `/profile/${username}`;
  const supabase = await createClient();

  const { data: { user: authUser } } = await supabase.auth.getUser();
  const { data: profile, error } = await supabase
    .from("users")
    .select("*")
    .eq("username", username)
    .single();

  if (error || !profile) notFound();

  const isOwner = authUser?.id === profile.id;
  const showcaseLimit = profile.showcase_limit || 5;

  // 1. DADOS SOCIAIS E INSÍGNIAS
  const [{ count: followersCount }, { count: followingCount }, { data: badgesData }] = await Promise.all([
    supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('following_id', profile.id),
    supabase.from('user_follows').select('*', { count: 'exact', head: true }).eq('follower_id', profile.id),
    supabase.from('user_badges').select('badge_id, awarded_at, badges(name, icon, color_class, description)').eq('user_id', profile.id)
  ]);

  // Tratamento de Insígnias para evitar erro de Array/Objeto
  const badges: FormattedBadge[] = (badgesData as unknown as RawUserBadge[])?.map(ub => {
    const badgeDetails = Array.isArray(ub.badges) ? ub.badges[0] : ub.badges;
    return {
      badge_id: ub.badge_id,
      awarded_at: ub.awarded_at,
      name: badgeDetails?.name || 'Insígnia',
      icon: badgeDetails?.icon || '🏅',
      color_class: badgeDetails?.color_class || 'text-gray-400',
      description: badgeDetails?.description || ''
    };
  }) || [];

  let isFollowing = false;
  if (authUser && !isOwner) {
    const { data } = await supabase.from('user_follows').select('follower_id').eq('follower_id', authUser.id).eq('following_id', profile.id).maybeSingle();
    if (data) isFollowing = true;
  }

  // 2. MURAL DE RECADOS
  const { data: commentsRaw } = await supabase
    .from('profile_comments')
    .select('*')
    .eq('profile_id', profile.id)
    .order('created_at', { ascending: false });

  const authorIds = [...new Set(commentsRaw?.map(c => c.author_id) || [])];
  const { data: authors } = await supabase.from('users').select('id, username, avatar_url').in('id', authorIds);

  const comments: ProfileComment[] = commentsRaw?.map(c => ({
    ...c,
    author: authors?.find(a => a.id === c.author_id)
  })) || [];

  // 3. COSMÉTICOS DA LOJA
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

  // 4. ESTANTE DE JOGOS
  let showcaseGames: ShowcaseGame[] = [];
  if (profile.showcase_games && profile.showcase_games.length > 0) {
    const { data: gamesData } = await supabase.from("games").select("id, title, cover_url").in("id", profile.showcase_games);
    if (gamesData) {
      showcaseGames = profile.showcase_games.map((id: string) => gamesData.find(g => g.id === id)).filter(Boolean) as ShowcaseGame[];
    }
  }

  const joinDate = new Date(profile.created_at).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });

  return (
    <div className="min-h-screen pb-20 animate-in fade-in duration-500">

      {/* BANNER DO PERFIL */}
      <div
        className="-mx-4 md:-mx-8 -mt-4 md:-mt-8 h-64 md:h-80 relative overflow-hidden border-b border-border/50 shadow-2xl rounded-b-4xl transition-all duration-700 z-0"
        style={{ background: styles.background || '#18181b' }}
      >
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-linear-to-t from-background via-background/40 to-transparent" />
      </div>

      {/* CARTÃO DE INFORMAÇÕES */}
      <div className="max-w-5xl mx-auto -mt-24 md:-mt-32 relative z-10 px-2 md:px-0">
        <div className="bg-surface/60 backdrop-blur-xl border border-border/60 rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col md:flex-row gap-6 md:gap-8 items-center md:items-start">

          {/* Avatar */}
          <div className="relative w-32 h-32 md:w-40 md:h-40 shrink-0 z-10 -mt-16 md:-mt-20">
            <div
              className="absolute inset-0 rounded-4xl p-1 shadow-2xl transition-all duration-700"
              style={{ background: styles.border || 'transparent' }}
            >
              <div className="w-full h-full rounded-3xl bg-background overflow-hidden relative flex items-center justify-center">
                {profile.avatar_url ? (
                  <Image src={profile.avatar_url} alt={profile.username} fill className="object-cover" unoptimized />
                ) : (
                  <span className="text-5xl font-black text-white">{profile.username.charAt(0).toUpperCase()}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 text-center md:text-left space-y-3 w-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight flex items-center justify-center md:justify-start gap-3 drop-shadow-md">
                  {profile.username}
                  <span className="text-xs font-black bg-primary/20 text-primary border border-primary/50 px-2.5 py-1 rounded-lg uppercase tracking-wider">
                    Lvl {profile.global_level || 1}
                  </span>
                </h1>
                <div className="mt-2">
                  {styles.titleStyle && styles.titleName ? (
                    <span className="inline-block px-4 py-1.5 rounded-lg border border-white/20 text-xs font-black shadow-lg text-white" style={{ background: styles.titleStyle }}>
                      {styles.titleName}
                    </span>
                  ) : (
                    <p className="text-primary font-bold text-sm tracking-widest uppercase">{profile.title}</p>
                  )}
                </div>

                {/* EXIBIÇÃO DE INSÍGNIAS (BADGES) */}
                <div className="flex flex-wrap justify-center md:justify-start gap-2 mt-4">
                  {badges.map((ub) => {
                    const isNew = new Date(ub.awarded_at).getTime() > new Date().getTime() - 86400000;
                    return (
                      <div
                        key={ub.badge_id}
                        title={`${ub.name}: ${ub.description}`}
                        className={`flex items-center gap-1.5 px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg cursor-help transition-all hover:bg-white/10 relative ${ub.color_class} ${isNew ? 'ring-2 ring-primary animate-pulse' : ''}`}
                      >
                        <span className="text-sm">{ub.icon}</span>
                        <span className="text-[9px] font-black uppercase tracking-widest text-white/80">{ub.name}</span>
                        {isNew && (
                          <span className="absolute -top-1 -right-1 flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2 shrink-0">
                {!isOwner && (
                  <Link
                    href={`/compare/${profile.username}`}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-primary/10 text-primary hover:bg-primary hover:text-white border border-primary/30 rounded-xl font-black text-sm transition-all shadow-lg hover:-translate-y-1"
                  >
                    ⚔️ Comparar
                  </Link>
                )}
                {isOwner ? (
                  <Link href={`/profile/${profile.username}/studio`} className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-black hover:bg-gray-200 rounded-xl text-sm transition-all shadow-md hover:scale-105 w-full md:w-auto font-black">
                    ⚙️ Configurar
                  </Link>
                ) : (
                  <SocialButtons targetId={profile.id} initialIsFollowing={isFollowing} currentPath={currentPath} />
                )}
              </div>
            </div>

            <p className="text-gray-300 leading-relaxed text-sm italic max-w-2xl mx-auto md:mx-0 bg-background/40 p-4 rounded-xl border border-white/5">
              &quot;{profile.bio || "Este caçador prefere manter o mistério."}&quot;
            </p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2">
              <div className="flex items-center gap-4 bg-background/60 px-4 py-2 rounded-xl border border-border/50">
                <Link href={`/profile/${profile.username}/network?tab=followers`} className="text-xs text-gray-400 font-bold uppercase tracking-wider hover:text-primary transition-colors">
                  <strong className="text-white text-base mr-1">{followersCount || 0}</strong> Seguidores
                </Link>
                <div className="w-px h-4 bg-border"></div>
                <Link href={`/profile/${profile.username}/network?tab=following`} className="text-xs text-gray-400 font-bold uppercase tracking-wider hover:text-primary transition-colors">
                  <strong className="text-white text-base mr-1">{followingCount || 0}</strong> Seguindo
                </Link>
              </div>
              <span className="text-[11px] text-gray-500 font-bold uppercase tracking-widest px-3 py-2 bg-surface rounded-xl border border-border/50">
                📅 Entrou em {joinDate}
              </span>
            </div>
          </div>

          <div className="flex md:flex-col gap-3 w-full md:w-auto">
            <div className="flex-1 md:flex-none text-center bg-background/60 border border-border/50 px-5 py-3 rounded-2xl shadow-inner min-w-28">
              <p className="text-3xl font-black text-white">{profile.total_games || 0}</p>
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Jogos</p>
            </div>
            <div className="flex-1 md:flex-none text-center bg-blue-500/10 border border-blue-500/20 px-5 py-3 rounded-2xl shadow-inner relative overflow-hidden min-w-28">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 pointer-events-none"></div>
              <p className="text-3xl font-black text-blue-400 relative z-10 drop-shadow-md">{profile.total_platinums || 0}</p>
              <p className="text-[10px] text-blue-500 font-bold uppercase tracking-widest mt-1 relative z-10">Platinas</p>
            </div>
          </div>
        </div>
      </div>

      {/* ÁREA INFERIOR: ESTANTE & MURAL */}
      <div className="max-w-5xl mx-auto px-4 md:px-0 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between border-b border-border/50 pb-3">
            <h2 className="text-2xl font-black text-white flex items-center gap-3 italic">
              🏆 Estante de Troféus
            </h2>
            <span className="text-xs font-bold text-gray-400 bg-surface px-3 py-1.5 rounded-lg border border-border">
              {showcaseGames.length} / {showcaseLimit} Slots
            </span>
          </div>

          {showcaseGames.length === 0 ? (
            <div className="h-64 bg-surface/30 rounded-3xl border border-dashed border-border/60 flex flex-col items-center justify-center text-center p-6 shadow-inner">
              <span className="text-5xl mb-4 opacity-50 drop-shadow-md">🎮</span>
              <h3 className="text-lg font-bold text-white mb-1">Estante Vazia</h3>
              <p className="text-sm text-gray-500 max-w-sm">
                {isOwner ? "Vá ao Estúdio de Configuração e escolha os seus maiores orgulhos para exibir aqui." : "Este caçador ainda não exibiu as suas platinas."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {showcaseGames.map((game) => (
                <Link href={`/games/${game.id}`} key={game.id} className="group relative aspect-3/4 rounded-2xl border border-border/50 bg-surface overflow-hidden hover:border-primary/50 transition-all shadow-lg hover:-translate-y-1">
                  <Image src={game.cover_url} alt={game.title} fill className="object-cover group-hover:scale-105 transition-transform" unoptimized />
                </Link>
              ))}

              {/* Slots vazios disponíveis */}
              {Array.from({ length: Math.max(0, showcaseLimit - showcaseGames.length) }).map((_, i) => (
                <div key={`empty-${i}`} className="aspect-3/4 rounded-2xl border-2 border-dashed border-border/30 bg-surface/20 flex flex-col items-center justify-center gap-2 opacity-50">
                  <span className="text-2xl">🔒</span>
                  <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Slot Disponível</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-border/50 pb-3 italic">
            <h2 className="text-2xl font-black text-white flex items-center gap-3">
              💬 Mural
            </h2>
          </div>
          <div className="bg-surface/50 backdrop-blur-sm border border-border rounded-3xl p-5 flex flex-col h-150 shadow-xl relative overflow-hidden">
            {authUser ? (
              <div className="mb-6 relative z-10">
                <CommentInput profileId={profile.id} currentPath={currentPath} />
              </div>
            ) : (
              <div className="mb-6 p-4 bg-background/80 rounded-2xl border border-border text-center text-sm text-gray-400 font-bold shadow-inner">
                Inicie sessão para deixar um recado.
              </div>
            )}
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar relative z-10">
              {comments.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-60 bg-background/30 rounded-2xl border border-dashed border-border/50">
                  <span className="text-4xl mb-3 drop-shadow-md">📭</span>
                  <p className="text-sm font-bold text-white mb-1">O mural está silencioso.</p>
                </div>
              ) : (
                comments.map((comment) => {
                  const canDelete = authUser?.id === comment.author_id || isOwner;
                  return (
                    <div key={comment.id} className="bg-background/80 border border-border/80 p-4 rounded-2xl flex gap-3.5 group relative shadow-sm hover:border-primary/30 transition-colors">
                      <Link href={`/profile/${comment.author?.username}`} className="w-10 h-10 rounded-full bg-surface shrink-0 overflow-hidden relative border border-border">
                        {comment.author?.avatar_url ? (
                          <Image src={comment.author.avatar_url} alt="Avatar" fill sizes="40px" className="object-cover" unoptimized />
                        ) : (
                          <span className="flex items-center justify-center w-full h-full text-sm font-bold text-primary bg-primary/10">{comment.author?.username?.charAt(0)}</span>
                        )}
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2 mb-1">
                          <Link href={`/profile/${comment.author?.username}`} className="font-bold text-white text-sm hover:text-primary transition-colors truncate">
                            {comment.author?.username}
                          </Link>
                          <span className="text-[10px] text-gray-500 font-bold uppercase shrink-0">{timeAgo(comment.created_at)}</span>
                        </div>
                        <p className="text-sm text-gray-300 leading-relaxed wrap-break-words">{comment.content}</p>
                      </div>
                      {canDelete && (
                        <div className="absolute -top-3 -right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-background rounded-full shadow-lg border border-border p-1">
                          <DeleteCommentButton commentId={comment.id} currentPath={currentPath} />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}