import { createClient } from "@/utils/supabase/server";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

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

  const joinDate = new Date(profile.created_at).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });

  const bannerClass = styles.background ? `bg-linear-to-r ${styles.background}` : "bg-linear-to-r from-primary/40 via-purple-900/40 to-background";
  const avatarBorderClass = styles.border ? `border-4 ${styles.border}` : "border-4 border-background";

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10 max-w-5xl mx-auto">
      <div className="relative bg-surface border border-border rounded-2xl overflow-hidden mt-4 shadow-xl">
        
        {/* BANNER */}
        <div className={`h-48 md:h-64 relative border-b border-border shadow-inner transition-all duration-700 ${bannerClass}`}>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 mix-blend-overlay"></div>
        </div>

        <div className="px-6 pb-6 relative flex flex-col md:flex-row md:items-end gap-6 -mt-12 md:-mt-16">
          <div className={`relative w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-surface flex items-center justify-center shrink-0 z-10 transition-all duration-700 ${avatarBorderClass}`}>
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.username}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="rounded-xl object-cover"
              />
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
              {styles.titleStyle ? (
                <span className={`inline-block px-3 py-1 rounded-md border text-xs font-bold mt-1 ${styles.titleStyle}`}>
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

        <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-white/5">
          <div className="md:col-span-2">
            <p className="text-gray-300 leading-relaxed text-sm md:text-base italic">&quot;{profile.bio}&quot;</p>
            <p className="text-xs text-gray-500 mt-3 font-medium uppercase tracking-wider">📅 Membro desde {joinDate}</p>
          </div>
          <div className="flex gap-4 md:justify-end items-center">
            <div className="text-center bg-background/50 border border-border px-4 py-2 rounded-xl min-w-20">
              <p className="text-2xl font-black text-white">{profile.total_games}</p>
              <p className="text-[10px] text-gray-500 font-bold uppercase">Jogos</p>
            </div>
            <div className="text-center bg-background/50 border border-border px-4 py-2 rounded-xl min-w-20 relative overflow-hidden">
              <div className="absolute inset-0 bg-blue-500/10"></div>
              <p className="text-2xl font-black text-blue-400 relative z-10">{profile.total_platinums}</p>
              <p className="text-[10px] text-gray-500 font-bold uppercase relative z-10">Platinas</p>
            </div>
          </div>
        </div>
      </div>

      <div className="h-64 bg-surface/30 rounded-3xl border border-dashed border-border flex items-center justify-center text-gray-500 text-sm font-medium">
        O sistema de conquistas está sendo sincronizado.
      </div>
    </div>
  );
}