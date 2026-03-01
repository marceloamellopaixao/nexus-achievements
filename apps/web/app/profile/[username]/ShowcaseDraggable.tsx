'use client'

import React, { useState, useEffect } from 'react';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragEndEvent 
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  rectSortingStrategy, 
  useSortable 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import FlipGameCard from "@/app/components/FlipGameCard";
import { GiPadlockOpen } from "react-icons/gi";
import { createClient } from "@/utils/supabase/client";

// 🔥 1. TIPAGENS ESTRITAS ADICIONADAS PARA CALAR O ESLINT
export interface ShowcaseGame {
  id: string;
  title: string;
  cover_url: string | null;
  total_achievements: number;
  console?: string | null;
}

export interface GameProgress {
  unlocked: number;
  is_platinum: boolean;
  playtime_minutes: number;
}

interface ShowcaseDraggableProps {
  initialGames: ShowcaseGame[];
  userProgressMap: Record<string, GameProgress>;
  isOwner: boolean;
  userId: string;
  showcaseLimit: number;
  backUrl: string;
}

// 2. COMPONENTE DA CARTA COM FÍSICAS (Sem 'any')
function SortableGameCard({ game, progress, backUrl, isOwner }: { game: ShowcaseGame, progress: GameProgress | null, backUrl: string, isOwner: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ 
    id: game.id, 
    disabled: !isOwner // Apenas o dono pode arrastar!
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1, // Traz a carta para a frente ao arrastar
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners} 
      // Se for dono, o cursor vira uma "mãozinha". No telemóvel, touch-none impede que a tela desça ao arrastar a carta.
      className={`relative ${isOwner ? 'cursor-grab active:cursor-grabbing touch-none' : ''} ${isDragging ? 'opacity-70 scale-105 shadow-2xl' : ''}`}
    >
      {/* A div pointer-events-none quando arrasta impede que o link do Next.js dispare acidentalmente */}
      <div className={isDragging ? 'pointer-events-none' : ''}>
        <FlipGameCard game={game} progress={progress} backUrl={backUrl} />
      </div>
    </div>
  );
}

// 3. COMPONENTE PRINCIPAL (A ESTANTE MÁGICA)
export default function ShowcaseDraggable({ initialGames, userProgressMap, isOwner, userId, showcaseLimit, backUrl }: ShowcaseDraggableProps) {
  const [games, setGames] = useState(initialGames);
  const supabase = createClient();

  // Se a prop initialGames mudar (ex: recarregamento do servidor), atualizamos o estado local
  useEffect(() => {
    setGames(initialGames);
  }, [initialGames]);

  // Sensores de clique: Ele só considera "Arrasto" se o rato/dedo mover 8 pixels. 
  // Senão, considera um clique normal e abre a página do jogo!
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    // Se soltou num lugar válido e diferente da posição original
    if (over && active.id !== over.id) {
      const oldIndex = games.findIndex((g) => g.id === active.id);
      const newIndex = games.findIndex((g) => g.id === over.id);
      
      // Reordena o Array Visualmente de Imediato (Sensação Instantânea)
      const newGamesOrder = arrayMove(games, oldIndex, newIndex);
      setGames(newGamesOrder);

      // Grava a nova ordem no Supabase silenciosamente
      const newOrderIds = newGamesOrder.map(g => g.id);
      await supabase.from('users').update({ showcase_games: newOrderIds }).eq('id', userId);
    }
  };

  const emptySlots = Math.max(0, showcaseLimit - games.length);

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 w-full">
        <SortableContext items={games.map(g => g.id)} strategy={rectSortingStrategy}>
          {games.map((game) => (
            <SortableGameCard 
              key={game.id} 
              game={game} 
              progress={userProgressMap[game.id] || null} 
              backUrl={backUrl} 
              isOwner={isOwner}
            />
          ))}
        </SortableContext>

        {/* Renderiza os slots vazios */}
        {Array.from({ length: emptySlots }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-3/4 rounded-2xl border-2 border-dashed border-white/5 bg-surface/20 flex flex-col items-center justify-center gap-2 opacity-50 w-full">
            <GiPadlockOpen className="text-xl sm:text-2xl md:text-3xl text-gray-600" />
            <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-gray-500 text-center px-1">Slot Livre</span>
          </div>
        ))}
      </div>
    </DndContext>
  );
}