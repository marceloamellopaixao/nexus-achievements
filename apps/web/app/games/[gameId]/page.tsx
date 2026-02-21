import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import GuideForm from "./GuideForm";
import { GuideVoteButton, GuideCommentForm } from "./GuideInteractions";

interface GamePageProps {
  params: Promise<{ gameId: string }>;
  searchParams: Promise<{ tab?: string, guideId?: string }>;
}

type SteamSchemaAchievement = { name: string; defaultvalue: number; displayName: string; hidden: number; description?: string; icon: string; icongray: string; };
type SteamPlayerAchievement = { apiname: string; achieved: number; unlocktime?: number; };
type CommunityUser = { user_id: string; is_platinum: boolean; unlocked_achievements: number; total_achievements: number; playtime_minutes: number; last_synced_at: string; users: { username: string; avatar_url: string | null; } | null; };

interface GuideAuthor { username: string; avatar_url: string | null; title: string | null; }
interface GameGuide { id: string; title: string; content: string; upvotes: number; created_at: string; users: GuideAuthor | null; }
interface GuideComment { id: string; content: string; created_at: string; users: { username: string; avatar_url: string | null; } | null; }

const renderGuideContent = (text: string) => {
  const parts = text.split(/(!\[.*?\]\(.*?\))/g);
  return parts.map((part, index) => {
    const match = part.match(/!\[(.*?)\]\((.*?)\)/);
    if (match) {
      return <img key={index} src={match[2]} alt={match[1] || 'Imagem do guia'} className="rounded-2xl my-6 max-w-full h-auto border border-border shadow-2xl" loading="lazy" />;
    }
    return <span key={index}>{part}</span>;
  });
};

export default async function GamePage(props: GamePageProps) {
  const { gameId } = await props.params;
  const { tab, guideId } = await props.searchParams;
  const activeTab = tab === 'guides' ? 'guides' : 'overview';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: game, error } = await supabase.from("games").select("*").eq("id", gameId).single();
  if (error || !game) notFound();

  // DADOS DA COMUNIDADE E PROGRESSO
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

  // DADOS DA STEAM (CONQUISTAS)
  const appId = gameId.replace("steam-", "");
  const STEAM_KEY = process.env.STEAM_API_KEY;
  let achievementsDetails: SteamSchemaAchievement[] = [];
  const playerUnlockedMap: Record<string, boolean> = {};

  if (activeTab === 'overview' && STEAM_KEY && !isNaN(Number(appId))) {
    try {
      const schemaRes = await fetch(`http://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?key=${STEAM_KEY}&appid=${appId}&l=brazilian`, { next: { revalidate: 86400 } }); if (schemaRes.ok) {
        const schemaData = await schemaRes.json();
        if (schemaData.game?.availableGameStats?.achievements) achievementsDetails = schemaData.game.availableGameStats.achievements;
      }
      if (user && userProgress) {
        const { data: userData } = await supabase.from('users').select('steam_id').eq('id', user.id).single();
        if (userData?.steam_id) {
          const playerAchRes = await fetch(`http://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/?appid=${appId}&key=${STEAM_KEY}&steamid=${userData.steam_id}&l=brazilian`, { cache: 'no-store' }); if (playerAchRes.ok) {
            const playerAchData = await playerAchRes.json();
            if (playerAchData.playerstats?.achievements) {
              playerAchData.playerstats.achievements.forEach((ach: SteamPlayerAchievement) => { playerUnlockedMap[ach.apiname] = ach.achieved === 1; });
            }
          }
        }
      }
    } catch (e) { console.error("Erro API Steam", e); }
  }

  // DADOS DA ABA GUIAS
  let guides: GameGuide[] = [];
  let selectedGuideComments: GuideComment[] = [];
  let hasVoted = false;
  let selectedGuide: GameGuide | null = null;

  if (activeTab === 'guides') {
    const { data: guidesData } = await supabase.from('game_guides').select('id, game_id, author_id, title, content, upvotes, created_at, users!game_guides_author_id_fkey ( username, avatar_url, title )').eq('game_id', gameId).order('created_at', { ascending: false });
    if (guidesData) {
      guides = guidesData.map((g: any) => ({ ...g, users: Array.isArray(g.users) ? g.users[0] : g.users })) as GameGuide[];
    }
    if (guideId && guides.length > 0) {
      selectedGuide = guides.find(g => g.id === guideId) || null;
      if (selectedGuide) {
        const { data: commentsData } = await supabase.from('guide_comments').select('id, content, created_at, users ( username, avatar_url )').eq('guide_id', guideId).order('created_at', { ascending: true });
        if (commentsData) selectedGuideComments = commentsData.map((c: any) => ({ ...c, users: Array.isArray(c.users) ? c.users[0] : c.users })) as GuideComment[];
        if (user) {
          const { data: vote } = await supabase.from('guide_votes').select('guide_id').eq('guide_id', guideId).eq('user_id', user.id).maybeSingle();
          if (vote) hasVoted = true;
        }
      }
    }
  }

  const hasBanner = typeof game.banner_url === 'string' && game.banner_url.trim() !== '';
  const hasCover = typeof game.cover_url === 'string' && game.cover_url.trim() !== '';

  return (
    <div className="min-h-screen pb-20 animate-in fade-in duration-500">

      {/* =========================================
          BANNER SEGURO (Sem rolagem horizontal)
          ========================================= */}
      <div className="-mx-4 md:-mx-8 -mt-4 md:-mt-8 h-80 md:h-125 relative bg-surface overflow-hidden border-b border-border/50 shadow-2xl rounded-b-[2rem]">
        {hasBanner ? (
          <Image
            src={game.banner_url}
            alt={game.title}
            fill
            className="object-cover opacity-60 mix-blend-lighten"
            priority
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 bg-linear-to-r from-blue-900 to-black opacity-50"></div>
        )}
        <div className="absolute inset-0 bg-linear-to-t from-background via-background/40 to-transparent" />
        <div className="absolute inset-0 bg-linear-to-r from-background/80 via-transparent to-background/80" />
      </div>

      {/* =========================================
          ÁREA DO PERFIL DO JOGO
          ========================================= */}
      <div className="max-w-6xl mx-auto -mt-32 md:-mt-48 relative z-10 px-2 md:px-0">
        <div className="flex flex-col md:flex-row gap-6 md:gap-10 items-start md:items-end">

          <div className="w-32 md:w-64 aspect-3/4 rounded-2xl md:rounded-3xl border-4 md:border-[6px] border-background bg-surface overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] relative shrink-0 group">
            {hasCover ? (
              <Image src={game.cover_url} alt={game.title} fill sizes="(max-width: 768px) 128px, 256px" className="object-cover z-10 group-hover:scale-105 transition-transform duration-500" priority unoptimized />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-surface text-primary border border-dashed border-border/50 z-10 relative">
                <span className="text-4xl opacity-50 mb-2">🎮</span>
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center px-2">Capa indisponível</span>
              </div>
            )}
            <div className="absolute inset-0 bg-surface flex items-center justify-center z-0"><span className="text-4xl opacity-20">🎮</span></div>
          </div>

          <div className="flex-1 w-full pb-2 md:pb-6">
            <h1 className="text-3xl md:text-6xl font-black text-white tracking-tighter drop-shadow-2xl leading-none">
              {game.title}
            </h1>
            <p className="text-primary font-bold tracking-widest uppercase text-xs md:text-sm mt-3 md:mt-4 bg-primary/10 inline-block px-3 py-1 rounded-md border border-primary/20">
              {game.developer || "Steam"}
            </p>

            {userProgress && (
              <div className={`mt-6 md:mt-8 p-6 rounded-3xl border backdrop-blur-md relative overflow-hidden transition-all duration-500 shadow-xl ${isPlat ? 'bg-blue-900/30 border-blue-500/50 shadow-blue-900/20' : 'bg-surface/80 border-border'}`}>
                {isPlat && <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 mix-blend-overlay pointer-events-none"></div>}
                {isPlat && <div className="absolute -right-20 -top-20 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>}

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
                        {isPlat ? "👑 Platina Desbloqueada" : "🎮 O Teu Progresso"}
                      </h3>
                      <span className={`text-sm md:text-base font-black ${isPlat ? 'text-blue-400 drop-shadow-md' : 'text-gray-300'}`}>
                        {unlocked} <span className="text-gray-500 font-medium">/ {total}</span> <span className="text-xs text-gray-400 font-bold bg-black/30 px-2 py-0.5 rounded ml-1">{percentage}%</span>
                      </span>
                    </div>

                    <div className="h-4 w-full bg-background/80 rounded-full overflow-hidden border border-border/50 shadow-inner">
                      <div className={`h-full transition-all duration-1000 ease-out relative ${isPlat ? 'bg-linear-to-r from-blue-400 via-blue-500 to-blue-400' : 'bg-linear-to-r from-primary/80 to-primary'}`} style={{ width: `${percentage}%` }}>
                        <div className="absolute top-0 left-0 right-0 bottom-0 bg-linear-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-background/60 px-5 py-3 rounded-2xl border border-white/5 flex flex-col items-center justify-center min-w-[140px] shadow-inner">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Tempo de Jogo</span>
                    <span className="text-xl font-black text-white">{playtimeHours}<span className="text-gray-500 text-sm font-bold mx-0.5">h</span> {playtimeMins}<span className="text-gray-500 text-sm font-bold ml-0.5">m</span></span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* NAVEGAÇÃO DE ABAS */}
        <div className="flex gap-2 md:gap-4 mt-12 mb-10 border-b border-border/50 pb-px">
          <Link href={`/games/${gameId}?tab=overview`} scroll={false} className={`pb-4 px-2 text-sm md:text-base font-black transition-all tracking-wider relative ${activeTab === 'overview' ? 'text-primary' : 'text-gray-500 hover:text-gray-300'}`}>
            VISÃO GERAL
            {activeTab === 'overview' && <span className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-t-full shadow-[0_0_10px_rgba(59,130,246,0.8)]"></span>}
          </Link>
          <Link href={`/games/${gameId}?tab=guides`} scroll={false} className={`pb-4 px-2 text-sm md:text-base font-black transition-all tracking-wider flex items-center gap-2 relative ${activeTab === 'guides' ? 'text-primary' : 'text-gray-500 hover:text-gray-300'}`}>
            GUIAS DA COMUNIDADE
            {guides.length > 0 && <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${activeTab === 'guides' ? 'bg-primary text-white' : 'bg-surface border border-border text-gray-400'}`}>{guides.length}</span>}
            {activeTab === 'guides' && <span className="absolute bottom-0 left-0 w-full h-1 bg-primary rounded-t-full shadow-[0_0_10px_rgba(59,130,246,0.8)]"></span>}
          </Link>
        </div>

        {/* CONTEÚDO: VISÃO GERAL */}
        {activeTab === 'overview' && (
          <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              <div className="bg-surface/40 backdrop-blur-sm border border-border p-5 md:p-6 rounded-3xl flex items-center gap-4 hover:border-border/80 transition-colors shadow-sm">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center text-2xl border border-blue-500/20">👥</div>
                <div><p className="text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-widest">Caçadores</p><p className="text-xl md:text-3xl font-black text-white">{totalPlayers}</p></div>
              </div>
              <div className="bg-surface/40 backdrop-blur-sm border border-border p-5 md:p-6 rounded-3xl flex items-center gap-4 hover:border-border/80 transition-colors shadow-sm">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-yellow-500/10 text-yellow-500 rounded-2xl flex items-center justify-center text-2xl border border-yellow-500/20">👑</div>
                <div><p className="text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-widest">Platinas Reais</p><p className="text-xl md:text-3xl font-black text-white">{totalPlatinums}</p></div>
              </div>
              <div className="bg-surface/40 backdrop-blur-sm border border-border p-5 md:p-6 rounded-3xl flex items-center gap-4 hover:border-border/80 transition-colors shadow-sm col-span-2 md:col-span-1">
                <div className="w-12 h-12 md:w-14 md:h-14 bg-green-500/10 text-green-400 rounded-2xl flex items-center justify-center text-2xl border border-green-500/20">📈</div>
                <div><p className="text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-widest">Taxa Global</p><p className="text-xl md:text-3xl font-black text-white">{completionRate}%</p></div>
              </div>
            </div>

            {achievementsDetails.length > 0 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-black text-white flex items-center gap-3">
                  <span className="text-3xl">🏆</span> Todas as Conquistas
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {achievementsDetails.map((ach) => {
                    const isUnlocked = playerUnlockedMap[ach.name];
                    const iconUrl = isUnlocked ? ach.icon : (ach.icongray || ach.icon);

                    return (
                      <div key={ach.name} className={`flex items-start gap-4 border p-4 rounded-2xl transition-all duration-300 group ${isUnlocked ? 'border-primary/30 bg-primary/5 hover:border-primary/60 hover:bg-primary/10 shadow-sm' : 'border-border/40 bg-surface/30 opacity-70 grayscale hover:grayscale-0 hover:opacity-100'}`}>

                        {/* A CAIXA DA IMAGEM E O SEU PONTO VERDE */}
                        <div className="relative w-14 h-14 shrink-0 group-hover:scale-105 transition-transform">

                          {/* A Imagem em si, com o overflow escondido para ficar redonda */}
                          <div className="w-full h-full rounded-xl overflow-hidden border border-border/50 relative">
                            <Image src={iconUrl} alt={ach.displayName} fill className="object-cover" unoptimized />
                          </div>

                          {/* O código exato que me enviou (por cima da imagem, no canto superior direito) */}
                          {isUnlocked && <div className="absolute top-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-background shadow-[0_0_10px_rgba(34,197,94,0.8)] z-10"></div>}

                        </div>

                        <div className="min-w-0 flex-1">
                          <p className={`font-bold text-sm truncate ${isUnlocked ? 'text-white' : 'text-gray-300'}`}>{ach.displayName}</p>
                          <p className={`text-xs mt-1 line-clamp-2 leading-relaxed ${isUnlocked ? 'text-gray-400' : 'text-gray-500 italic'}`}>{ach.description || 'Conquista oculta.'}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* CONTEÚDO: GUIAS DA COMUNIDADE */}
        {activeTab === 'guides' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {guideId && selectedGuide ? (
              <div className="bg-surface/30 border border-border rounded-[2rem] p-6 md:p-10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-primary via-purple-500 to-primary"></div>
                <Link href={`/games/${gameId}?tab=guides`} className="inline-flex items-center gap-2 text-gray-400 hover:text-white font-bold text-sm mb-8 transition-colors bg-background/50 px-4 py-2 rounded-xl border border-border">
                  ← Voltar à Biblioteca de Guias
                </Link>
                <h2 className="text-3xl md:text-5xl font-black text-white mb-6 leading-tight drop-shadow-lg">{selectedGuide.title}</h2>
                <div className="flex items-center gap-4 mb-8 pb-8 border-b border-border/50">
                  <div className="w-14 h-14 rounded-full overflow-hidden bg-background border-2 border-border relative">
                    {selectedGuide.users?.avatar_url ? <Image src={selectedGuide.users.avatar_url} alt="Avatar" fill className="object-cover" /> : <span className="flex items-center justify-center w-full h-full text-lg font-bold text-primary">{selectedGuide.users?.username.charAt(0)}</span>}
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Escrito pelo mestre <span className="text-white font-black">{selectedGuide.users?.username}</span></p>
                    <p className="text-xs text-gray-500 mt-1 font-bold tracking-wider uppercase">{new Date(selectedGuide.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
                <div className="text-base text-gray-300 leading-relaxed whitespace-pre-wrap">{renderGuideContent(selectedGuide.content)}</div>
                <div className="mt-12 pt-8 border-t border-border flex flex-col items-center gap-4">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Este guia salvou a sua platina?</p>
                  <GuideVoteButton guideId={selectedGuide.id} gameId={gameId} initialVotes={selectedGuide.upvotes} hasVoted={hasVoted} />
                </div>
                <div className="mt-16 bg-background/50 border border-border p-6 md:p-8 rounded-3xl">
                  <h3 className="text-xl font-black text-white flex items-center gap-3 mb-6">💬 Comentários <span className="bg-primary/20 border border-primary/30 px-3 py-1 rounded-lg text-sm text-primary">{selectedGuideComments.length}</span></h3>
                  <GuideCommentForm guideId={selectedGuide.id} gameId={gameId} />
                  <div className="mt-8 space-y-4">
                    {selectedGuideComments.map(comment => (
                      <div key={comment.id} className="bg-surface/50 border border-border p-5 rounded-2xl flex gap-4">
                        <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border border-border relative">
                          {comment.users?.avatar_url ? <Image src={comment.users.avatar_url} fill className="object-cover" alt="Avatar" /> : <span className="flex items-center justify-center w-full h-full font-bold text-primary bg-primary/10">{comment.users?.username.charAt(0)}</span>}
                        </div>
                        <div>
                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="font-bold text-white text-sm">{comment.users?.username}</span>
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{new Date(comment.created_at).toLocaleDateString('pt-BR')}</span>
                          </div>
                          <p className="text-sm text-gray-300 leading-relaxed">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {user ? <GuideForm gameId={gameId} /> : <div className="bg-surface/50 border border-border p-8 rounded-3xl text-center shadow-inner"><p className="text-gray-400 font-bold">Inicie sessão no Nexus para partilhar o seu conhecimento.</p></div>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  {guides.length === 0 ? (
                    <div className="col-span-1 md:col-span-2 py-24 text-center flex flex-col items-center justify-center opacity-60 bg-surface/20 border border-dashed border-border rounded-3xl">
                      <span className="text-6xl mb-4 drop-shadow-md">📚</span>
                      <h3 className="text-2xl font-black text-white">Nenhum guia disponível</h3>
                      <p className="text-sm mt-2 text-gray-400 max-w-sm">A comunidade precisa de si. Seja o primeiro a escrever um guia de platina para este jogo!</p>
                    </div>
                  ) : (
                    guides.map(guide => (
                      <Link href={`/games/${gameId}?tab=guides&guideId=${guide.id}`} key={guide.id} className="bg-surface/40 backdrop-blur-sm border border-border p-6 rounded-3xl hover:border-primary/50 hover:bg-surface/80 transition-all duration-300 group flex flex-col h-full shadow-md hover:shadow-xl hover:-translate-y-1">
                        <div className="flex-1">
                          <h3 className="text-xl font-black text-white mb-3 group-hover:text-primary transition-colors line-clamp-2 leading-tight">{guide.title}</h3>
                          <p className="text-sm text-gray-400 line-clamp-3 leading-relaxed mb-6">{guide.content.replace(/!\[.*?\]\(.*?\)/g, '🖼️ [Imagem Anexa] ')}</p>
                        </div>
                        <div className="flex items-center justify-between pt-5 border-t border-border/50">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-background overflow-hidden relative border border-border group-hover:border-primary transition-colors">
                              {guide.users?.avatar_url ? <Image src={guide.users.avatar_url} fill className="object-cover" alt="Avatar" /> : <span className="flex items-center justify-center w-full h-full text-xs font-bold text-primary">{guide.users?.username.charAt(0)}</span>}
                            </div>
                            <span className="text-xs font-bold text-gray-300 group-hover:text-white transition-colors">{guide.users?.username}</span>
                          </div>
                          <div className="flex items-center gap-1.5 bg-background/80 border border-border px-3 py-1.5 rounded-xl text-xs font-black text-gray-400 shadow-inner group-hover:text-primary transition-colors">
                            <span className="text-base">👍</span> {guide.upvotes}
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