'use client'

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Image from "next/image";
import Link from "next/link";
import { DeleteCommentButton } from "./CommentForm";

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

interface MuralListProps {
  initialComments: ProfileComment[];
  profileId: string;
  authUserId: string | undefined;
  isOwner: boolean;
  currentPath: string;
}

export default function MuralList({ initialComments, profileId, authUserId, isOwner, currentPath }: MuralListProps) {
  const [comments, setComments] = useState<ProfileComment[]>(initialComments);
  const supabase = createClient();

  useEffect(() => {
    // Sincroniza estado local se o server component mudar
    setComments(initialComments);
  }, [initialComments]);

  useEffect(() => {
    const channel = supabase
      .channel(`mural-${profileId}`)
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'profile_comments', filter: `profile_id=eq.${profileId}` }, 
        async (payload) => {
          // Busca os dados do autor em tempo real para a nova mensagem
          const { data: author } = await supabase
            .from('users')
            .select('id, username, avatar_url')
            .eq('id', payload.new.author_id)
            .single();

          const newComment = { ...payload.new, author } as ProfileComment;
          setComments(prev => [newComment, ...prev]);
        }
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'profile_comments' },
        (payload) => {
          setComments(prev => prev.filter(c => c.id !== payload.old.id));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profileId, supabase]);

  if (comments.length === 0) {
    return (
      <div className="h-40 flex flex-col items-center justify-center text-center opacity-60 bg-background/20 rounded-2xl border border-dashed border-border/50">
        <span className="text-3xl mb-2">📭</span>
        <p className="text-xs font-bold text-white uppercase tracking-widest">Mural Vazio</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => {
        const canDelete = authUserId === comment.author_id || isOwner;
        return (
          <div key={comment.id} className="group relative bg-background/40 backdrop-blur-md border border-border/50 p-4 rounded-2xl flex gap-3.5 transition-all duration-300 hover:border-primary/30 hover:bg-background/60 shadow-sm overflow-visible">
            <Link href={`/profile/${comment.author?.username}`} className="shrink-0">
              <div className="w-10 h-10 rounded-full overflow-hidden relative border border-border/50 group-hover:border-primary/40 bg-surface">
                {comment.author?.avatar_url ? (
                  <Image src={comment.author.avatar_url} alt="" fill className="object-cover" unoptimized />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-black text-primary bg-primary/10 text-xs">
                    {comment.author?.username?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </Link>

            <div className="flex-1 min-w-0 pr-6">
              <div className="flex items-center gap-2 mb-1">
                <Link href={`/profile/${comment.author?.username}`} className="font-bold text-white text-xs hover:text-primary transition-colors truncate">
                  {comment.author?.username}
                </Link>
                <span className="text-[9px] font-bold text-gray-500 uppercase">
                   {new Date(comment.created_at).toLocaleDateString('pt-BR')}
                </span>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed wrap-break-words font-medium">
                {comment.content}
              </p>
            </div>

            {canDelete && (
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all transform scale-90 group-hover:scale-100">
                <DeleteCommentButton commentId={comment.id} currentPath={currentPath} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}