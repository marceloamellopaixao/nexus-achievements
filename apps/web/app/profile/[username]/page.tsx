import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

type ShowcaseGame = {
  id: string;
  title: string;
  cover_url: string;
};

export default async function PublicProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;
  const supabase = await createClient();

  const { data: { user: authUser } } = await supabase.auth.getUser();
  const { data: profile, error } = await supabase
    .from("users")
    .select("*")
    .eq("username", username)
    .single();

  if (error || !profile) {
    notFound();
  }

  const isOwner = authUser?.id === profile.id;

  const equippedIds = [
    profile.equipped_background, 
    profile.equipped_border, 
    profile.equipped_title
  ].filter(Boolean);

  const styles = { 
    background: null as string | null, 
    border: null as string | null, 
    titleStyle: null as string | null, 
    titleName: null as string | null 
  };

  if (equippedIds.length > 0) {
    const { data: shopItems } = await supabase
      .from("shop_items")
      .select("*")
      .in("id", equippedIds);

    if (shopItems) {
      styles.background = shopItems.find(i => i.id === profile.equipped_background)?.gradient || null;
      styles.border = shopItems.find(i => i.id === profile.equipped_border)?.border_style || null;
      const t = shopItems.find(i => i.id === profile.equipped_title);
      styles.titleStyle = t?.tag_style || null;
      styles.titleName = t?.name || null;
    }
  }

  let showcaseGames: ShowcaseGame[] = [];
  if (profile.showcase_games && profile.showcase_games.length > 0) {
    const { data: gamesData } = await supabase
      .from("games")
      .select("id, title, cover_url")
      .in("id", profile.showcase_games);
      
    if (gamesData) {
      showcaseGames = profile.showcase_games
        .map((id: string) => gamesData.find(g => g.id === id))
        .filter(Boolean) as ShowcaseGame[];
    }
  }

  const joinDate = new Date(profile.created_at).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 max-w-5xl mx-auto">
      
      <div className="relative bg-surface border border-border rounded-2xl overflow-hidden mt-4 shadow-xl">
        
        {/* Banner Dinâmico com style inline */}
        <div 
          className="h-48 md:h-64 relative border-b border-border shadow-inner transition-all duration-700"
          style={styles.background ? { background: styles.background } : { backgroundColor: '#18181b' }}
        >
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 mix-blend-overlay"></div>
        </div>

        <div className="px-6 pb-6 relative flex flex-col md:flex-row md:items-end gap-6 -mt-12 md:-mt-16">
          
          {/* Avatar Dinâmico */}
          <div 
            className="relative w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-surface flex items-center justify-center shrink-0 z-10 transition-all duration-700 shadow-2xl border-4"
            style={styles.border ? { borderImage: styles.border, borderImageSlice: 1 } : { borderColor: '#09090b' }}
          >
            {profile.avatar_url ? (
              <Image src={profile.avatar_url} alt={profile.username} fill className="rounded-xl object-cover" />
            ) : (
              <span className="text-4xl font-bold text-white">{profile.username.charAt(0).toUpperCase()}</span>
            )}
          </div>

          <div className="flex-1 space-y-1 mb-2">
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight flex items-center gap-3">
              {profile.username}
              <span className="text-xs font-bold bg-primary/20 text-primary border border-primary/50 px-2 py-1 rounded-md uppercase tracking-wider">
                Lvl {profile.global_level || 1}
              </span>
            </h1>
            <div>
              {styles.titleStyle && styles.titleName ? (
                <span 
                  className="inline-block px-3 py-1 rounded-md border text-xs font-bold mt-1 shadow-sm"
                  style={{ background: styles.titleStyle }}
                >
                  {styles.titleName}
                </span>
              ) : (
                <p className="text-primary font-medium">{profile.title}</p>
              )}
            </div>
          </div>

          {isOwner && (
            <div className="mb-2">
              <Link href={`/profile/${profile.username}/studio`} className="inline-block w-full md:w-auto text-center px-6 py-2.5 bg-white text-black hover:bg-gray-200 rounded-lg font-bold text-sm transition-colors shadow-sm">
                ⚙️ Configurar Perfil
              </Link>
            </div>
          )}
        </div>

        {/* Stats Fixas */}
        <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-white/5">
          <div className="md:col-span-2">
            <p className="text-gray-300 leading-relaxed text-sm md:text-base italic">&quot;{profile.bio}&quot;</p>
            <p className="text-xs text-gray-500 mt-3 font-medium uppercase tracking-wider">📅 Membro desde {joinDate}</p>
          </div>
          <div className="flex gap-4 md:justify-end items-center">
            <div className="text-center bg-background/50 border border-border px-4 py-2 rounded-xl min-w-20">
              <p className="text-2xl font-black text-white">{profile.total_games || 0}</p>
              <p className="text-[10px] text-gray-500 font-bold uppercase">Jogos</p>
            </div>
            <div className="text-center bg-background/50 border border-border px-4 py-2 rounded-xl min-w-20 relative overflow-hidden">
              <div className="absolute inset-0 bg-blue-500/10"></div>
              <p className="text-2xl font-black text-blue-400 relative z-10">{profile.total_platinums || 0}</p>
              <p className="text-[10px] text-gray-500 font-bold uppercase relative z-10">Platinas</p>
            </div>
          </div>
        </div>
      </div>

      {/* ESTANTE DE TROFÉUS DINÂMICA */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">🏆 Estante de Troféus</h2>
          <span className="text-xs font-medium text-gray-500 bg-surface px-2 py-1 rounded border border-border">
            {showcaseGames.length} / 5 Slots
          </span>
        </div>
        
        {showcaseGames.length === 0 ? (
          <div className="h-48 bg-surface/30 rounded-3xl border border-dashed border-border flex flex-col items-center justify-center text-gray-500 text-sm font-medium">
            <span className="text-3xl mb-2 opacity-50">🎮</span>
            Este caçador ainda não exibiu nenhum troféu.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {showcaseGames.map((game, idx) => (
              <Link href={`/games/${game.id}`} key={`${game.id}-${idx}`} className="relative aspect-3/4 rounded-xl border border-border/50 bg-surface overflow-hidden hover:border-primary/50 transition-all cursor-pointer shadow-lg group">
                <Image src={game.cover_url} alt={game.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/90 via-black/40 to-transparent p-3 pt-12 translate-y-2 group-hover:translate-y-0 transition-transform">
                  <p className="font-bold text-white text-xs truncate drop-shadow-md">{game.title}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}