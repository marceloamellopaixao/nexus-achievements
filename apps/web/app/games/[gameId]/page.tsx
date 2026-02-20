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

interface GuideAuthor {
  username: string;
  avatar_url: string | null;
  title: string | null;
}

interface GameGuide {
  id: string;
  title: string;
  content: string;
  upvotes: number;
  created_at: string;
  users: GuideAuthor | null;
}

interface GuideComment {
  id: string;
  content: string;
  created_at: string;
  users: {
    username: string;
    avatar_url: string | null;
  } | null;
}

const renderGuideContent = (text: string) => {
  const parts = text.split(/(!\[.*?\]\(.*?\))/g);
  return parts.map((part, index) => {
    const match = part.match(/!\[(.*?)\]\((.*?)\)/);
    if (match) {
      return (
        <img
          key={index}
          src={match[2]}
          alt={match[1] || 'Imagem do guia'}
          width={800}
          height={450}
          className="rounded-xl my-6 max-w-full h-auto border border-border shadow-lg"
        />
      );
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

  // BUSCA DADOS DA COMUNIDADE E PROGRESSO (Sempre roda, independente da aba)
  const { data: communityRaw } = await supabase.from("user_games").select(`user_id, is_platinum, unlocked_achievements, total_achievements, playtime_minutes, last_synced_at, users ( username, avatar_url )`).eq("game_id", gameId);
  const communityData = (communityRaw as unknown as CommunityUser[]) || [];
  const userProgress = communityData.find(p => p.user_id === user?.id) || null;

  // Estatísticas Gerais
  const totalPlayers = communityData.length;
  const totalPlatinums = communityData.filter(p => p.is_platinum).length;
  const completionRate = totalPlayers > 0 ? Math.round((totalPlatinums / totalPlayers) * 100) : 0;

  // Progresso Pessoal
  const total = userProgress?.total_achievements || game.total_achievements || 0;
  const unlocked = userProgress?.unlocked_achievements || 0;
  const percentage = total > 0 ? Math.round((unlocked / total) * 100) : 0;
  const isPlat = userProgress?.is_platinum;

  // Conversão de Tempo (Minutos para Horas)
  const playtimeHours = userProgress ? Math.floor(userProgress.playtime_minutes / 60) : 0;
  const playtimeMins = userProgress ? userProgress.playtime_minutes % 60 : 0;

  // DADOS ESPECÍFICOS DA ABA OVERVIEW (Conquistas da Steam)
  const appId = gameId.replace("steam-", "");
  const STEAM_KEY = process.env.STEAM_API_KEY;
  let achievementsDetails: SteamSchemaAchievement[] = [];
  const playerUnlockedMap: Record<string, boolean> = {};

  if (activeTab === 'overview' && STEAM_KEY && !isNaN(Number(appId))) {
    try {
      const schemaRes = await fetch(`http://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?key=${STEAM_KEY}&appid=${appId}`, { next: { revalidate: 86400 } });
      if (schemaRes.ok) {
        const schemaData = await schemaRes.json();
        if (schemaData.game?.availableGameStats?.achievements) achievementsDetails = schemaData.game.availableGameStats.achievements;
      }
      if (user && userProgress) {
        const { data: userData } = await supabase.from('users').select('steam_id').eq('id', user.id).single();
        if (userData?.steam_id) {
          const playerAchRes = await fetch(`http://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v0001/?appid=${appId}&key=${STEAM_KEY}&steamid=${userData.steam_id}`, { cache: 'no-store' });
          if (playerAchRes.ok) {
            const playerAchData = await playerAchRes.json();
            if (playerAchData.playerstats?.achievements) {
              playerAchData.playerstats.achievements.forEach((ach: SteamPlayerAchievement) => { playerUnlockedMap[ach.apiname] = ach.achieved === 1; });
            }
          }
        }
      }
    } catch (e) { console.error("Erro API Steam", e); }
  }

  // DADOS ESPECÍFICOS DA ABA GUIAS
  let guides: GameGuide[] = [];
  let selectedGuideComments: GuideComment[] = [];
  let hasVoted = false;
  let selectedGuide: GameGuide | null = null;

  if (activeTab === 'guides') {
    // 1. Busca os guias com os dados do autor (users)
    const { data: guidesData, error: guidesError } = await supabase
      .from('game_guides')
      .select(`
        id, 
        game_id,
        author_id,
        title, 
        content, 
        upvotes, 
        created_at, 
        users!game_guides_author_id_fkey ( 
          username, 
          avatar_url, 
          title 
        )
      `)
      .eq('game_id', gameId)
      .order('created_at', { ascending: false });

    if (guidesError) {
      console.error("Erro ao buscar guias:", guidesError);
    } else if (guidesData) {
      // 2. Mapeamento manual para garantir que o objeto 'users' chegue correto à interface
      guides = guidesData.map((g: any) => ({
        id: g.id,
        title: g.title,
        content: g.content,
        upvotes: g.upvotes || 0,
        created_at: g.created_at,
        users: Array.isArray(g.users) ? g.users[0] : g.users
      })) as GameGuide[];
    }

    // 3. Lógica para Guia Selecionado
    if (guideId && guides.length > 0) {
      selectedGuide = guides.find(g => g.id === guideId) || null;

      if (selectedGuide) {
        const { data: commentsData } = await supabase
          .from('guide_comments')
          .select(`
            id, 
            content, 
            created_at, 
            users ( 
              username, 
              avatar_url 
            )
          `)
          .eq('guide_id', guideId)
          .order('created_at', { ascending: true });

        if (commentsData) {
          selectedGuideComments = commentsData.map((c: any) => ({
            id: c.id,
            content: c.content,
            created_at: c.created_at,
            users: Array.isArray(c.users) ? c.users[0] : c.users
          })) as GuideComment[];
        }

        if (user) {
          const { data: vote } = await supabase
            .from('guide_votes')
            .select('guide_id')
            .eq('guide_id', guideId)
            .eq('user_id', user.id)
            .maybeSingle();
          if (vote) hasVoted = true;
        }
      }
    }
  }

  const hasBanner = typeof game.banner_url === 'string' && game.banner_url.trim() !== '';
  const hasCover = typeof game.cover_url === 'string' && game.cover_url.trim() !== '';

  return (
    <div className="min-h-screen pb-20 animate-in fade-in duration-500">
      {/* HEADER / BANNER */}
      <div className="h-72 md:h-96 w-full bg-surface relative overflow-hidden rounded-b-3xl border-b border-border shadow-2xl">
        {hasBanner ? <Image src={game.banner_url} alt={game.title} width={1280} height={720} className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-luminosity" priority /> : <div className="absolute inset-0 bg-linear-to-r from-blue-900 to-black opacity-50"></div>}
        <div className="absolute inset-0 bg-linear-to-t from-background via-background/80 to-transparent" />
      </div>

      <div className="max-w-6xl mx-auto px-6 -mt-32 relative z-10">
        <div className="flex flex-col md:flex-row gap-8 items-start md:items-end">
          <div className="w-48 aspect-3/4 rounded-2xl border-4 border-background bg-surface overflow-hidden shadow-2xl relative shrink-0">
            {hasCover ? <Image src={game.cover_url} alt={game.title} width={192} height={256} className="w-full h-full object-cover" priority /> : <div className="w-full h-full flex items-center justify-center text-5xl font-bold bg-primary/20 text-primary">🎮</div>}
          </div>
          <div className="flex-1 pb-4 w-full">
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-lg">{game.title}</h1>
            <p className="text-primary font-bold tracking-widest uppercase text-sm mt-2">{game.developer || "Steam"}</p>

            {/* PROGRESSO E TEMPO DE JOGO */}
            {userProgress && (
              <div className={`mt-6 p-5 rounded-2xl border relative overflow-hidden transition-colors ${isPlat ? 'bg-blue-900/20 border-blue-500/50' : 'bg-surface/80 border-border shadow-lg'}`}>
                {isPlat && <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 mix-blend-overlay pointer-events-none"></div>}

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                        {isPlat ? "🏆 Platina Conquistada!" : "🎮 Seu Progresso"}
                      </h3>
                      <span className={`text-sm font-bold ${isPlat ? 'text-blue-400' : 'text-gray-400'}`}>
                        {unlocked} / {total} ({percentage}%)
                      </span>
                    </div>
                    <div className="h-3 w-full bg-background rounded-full overflow-hidden border border-border/50">
                      <div className={`h-full transition-all duration-1000 ease-out ${isPlat ? 'bg-linear-to-r from-blue-400 to-blue-600' : 'bg-primary'}`} style={{ width: `${percentage}%` }}></div>
                    </div>
                  </div>

                  <div className="bg-background/40 px-4 py-2 rounded-xl border border-white/5 flex flex-col items-center justify-center min-w-30">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Tempo de Jogo</span>
                    <span className="text-lg font-black text-white">{playtimeHours}h {playtimeMins}m</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* NAVEGAÇÃO DE ABAS */}
        <div className="flex gap-6 border-b border-border mt-12 mb-8">
          <Link href={`/games/${gameId}?tab=overview`} scroll={false} className={`pb-3 text-sm font-black transition-colors uppercase tracking-wider ${activeTab === 'overview' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-300'}`}>Visão Geral</Link>
          <Link href={`/games/${gameId}?tab=guides`} scroll={false} className={`pb-3 text-sm font-black transition-colors uppercase tracking-wider flex items-center gap-2 ${activeTab === 'guides' ? 'text-primary border-b-2 border-primary' : 'text-gray-500 hover:text-gray-300'}`}>
            Guias da Comunidade
            {guides.length > 0 && activeTab !== 'guides' && <span className="bg-surface border border-border px-2 py-0.5 rounded text-[10px]">{guides.length}</span>}
          </Link>
        </div>

        {/* CONTEÚDO: VISÃO GERAL */}
        {activeTab === 'overview' && (
          <div className="space-y-12 animate-in fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-surface/50 border border-border p-6 rounded-2xl flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center text-2xl">👥</div>
                <div><p className="text-xs text-gray-500 font-bold uppercase">Jogadores</p><p className="text-2xl font-black text-white">{totalPlayers}</p></div>
              </div>
              <div className="bg-surface/50 border border-border p-6 rounded-2xl flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-500/10 text-purple-400 rounded-full flex items-center justify-center text-2xl">👑</div>
                <div><p className="text-xs text-gray-500 font-bold uppercase">Platinas</p><p className="text-2xl font-black text-white">{totalPlatinums}</p></div>
              </div>
              <div className="bg-surface/50 border border-border p-6 rounded-2xl flex items-center gap-4">
                <div className="w-12 h-12 bg-green-500/10 text-green-400 rounded-full flex items-center justify-center text-2xl">📈</div>
                <div><p className="text-xs text-gray-500 font-bold uppercase">Taxa de Platina</p><p className="text-2xl font-black text-white">{completionRate}%</p></div>
              </div>
            </div>

            {achievementsDetails.length > 0 && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">🏆 Conquistas do Jogo</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {achievementsDetails.map((ach) => {
                    const isUnlocked = playerUnlockedMap[ach.name];
                    const iconUrl = isUnlocked ? ach.icon : (ach.icongray || ach.icon);
                    return (
                      <div key={ach.name} className={`flex items-start gap-4 bg-surface border p-4 rounded-xl transition-all ${isUnlocked ? 'border-primary/50 bg-primary/5' : 'border-border/50 opacity-60 grayscale'}`}>
                        <img src={iconUrl} alt={ach.displayName} className="w-12 h-12 rounded-lg shrink-0 object-cover" width={12} height={12} />
                        <div className="min-w-0">
                          <p className="font-bold text-white text-sm truncate">{ach.displayName}</p>
                          <p className="text-xs text-gray-400 mt-1 line-clamp-2">{ach.description || 'Conquista oculta.'}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* CONTEÚDO: GUIAS */}
        {activeTab === 'guides' && (
          <div className="animate-in fade-in">
            {/* MODO DETALHE */}
            {guideId && selectedGuide ? (
              <div className="bg-surface/30 border border-border rounded-3xl p-6 md:p-10 shadow-2xl">
                <Link href={`/games/${gameId}?tab=guides`} className="inline-flex items-center gap-2 text-primary font-bold text-sm mb-8 hover:underline bg-primary/10 px-4 py-2 rounded-lg">
                  ← Voltar para a lista
                </Link>
                <h2 className="text-3xl md:text-5xl font-black text-white mb-6 leading-tight">{selectedGuide.title}</h2>
                <div className="flex items-center gap-4 mb-8 pb-8 border-b border-border/50">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-background border border-border relative">
                    {selectedGuide.users?.avatar_url ? <Image src={selectedGuide.users.avatar_url} alt="Avatar" fill className="object-cover" /> : <span className="flex items-center justify-center w-full h-full text-lg font-bold">{selectedGuide.users?.username.charAt(0)}</span>}
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Escrito por <span className="text-white font-bold">{selectedGuide.users?.username}</span></p>
                    <p className="text-xs text-gray-500 mt-0.5">{new Date(selectedGuide.created_at).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
                <div className="text-base text-gray-300 leading-relaxed whitespace-pre-wrap">{renderGuideContent(selectedGuide.content)}</div>
                <div className="mt-12 pt-8 border-t border-border flex flex-col items-center gap-4">
                  <GuideVoteButton guideId={selectedGuide.id} gameId={gameId} initialVotes={selectedGuide.upvotes} hasVoted={hasVoted} />
                </div>
                {/* Seção de Comentários */}
                <div className="mt-16 bg-background/50 border border-border p-6 md:p-8 rounded-2xl">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">💬 Comentários <span className="bg-surface px-2 py-0.5 rounded text-sm text-primary">{selectedGuideComments.length}</span></h3>
                  <GuideCommentForm guideId={selectedGuide.id} gameId={gameId} />
                  <div className="mt-8 space-y-4">
                    {selectedGuideComments.map(comment => (
                      <div key={comment.id} className="bg-surface border border-border p-4 rounded-xl flex gap-4">
                        <div className="w-10 h-10 rounded-full overflow-hidden shrink-0 border border-border relative">
                          {comment.users?.avatar_url ? <Image src={comment.users.avatar_url} fill className="object-cover" alt="Avatar" /> : <span className="flex items-center justify-center w-full h-full font-bold">{comment.users?.username.charAt(0)}</span>}
                        </div>
                        <div>
                          <div className="flex items-baseline gap-2">
                            <span className="font-bold text-white text-sm">{comment.users?.username}</span>
                            <span className="text-[10px] text-gray-500">{new Date(comment.created_at).toLocaleDateString('pt-BR')}</span>
                          </div>
                          <p className="text-sm text-gray-300 mt-1">{comment.content}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {user ? <GuideForm gameId={gameId} /> : <div className="bg-surface border border-border p-6 rounded-2xl text-center"><p className="text-gray-400 font-medium">Tem de iniciar sessão para escrever um guia.</p></div>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {guides.length === 0 ? (
                    <div className="col-span-1 md:col-span-2 py-20 text-center flex flex-col items-center justify-center opacity-50">
                      <span className="text-6xl mb-4">📚</span>
                      <h3 className="text-xl font-bold text-white">Nenhum guia encontrado</h3>
                    </div>
                  ) : (
                    guides.map(guide => (
                      <Link href={`/games/${gameId}?tab=guides&guideId=${guide.id}`} key={guide.id} className="bg-surface/50 border border-border p-6 rounded-2xl hover:border-primary/50 hover:bg-surface transition-all group flex flex-col h-full shadow-sm hover:shadow-md cursor-pointer">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-white mb-3 group-hover:text-primary transition-colors line-clamp-2">{guide.title}</h3>
                          <p className="text-sm text-gray-400 line-clamp-3 leading-relaxed mb-6">{guide.content.replace(/!\[.*?\]\(.*?\)/g, '🖼️ ')}</p>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-border/50">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-background overflow-hidden relative border border-border">
                              {guide.users?.avatar_url ? <Image src={guide.users.avatar_url} fill className="object-cover" alt="Avatar" /> : <span className="flex items-center justify-center w-full h-full text-[10px] font-bold text-white">{guide.users?.username.charAt(0)}</span>}
                            </div>
                            <span className="text-xs font-bold text-gray-300">{guide.users?.username}</span>
                          </div>
                          <div className="flex items-center gap-1 bg-background border border-border px-2 py-1 rounded-md text-xs font-bold text-gray-400">👍 {guide.upvotes}</div>
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