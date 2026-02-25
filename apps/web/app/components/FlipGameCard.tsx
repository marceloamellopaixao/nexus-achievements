import Image from "next/image";
import Link from "next/link";
import { FaTrophy, FaGamepad, FaClock, FaFire } from "react-icons/fa";
import GameCardImage from "./GameCardImage";

interface FlipGameCardProps {
  game: {
    id: string;
    title: string;
    cover_url: string | null;
    total_achievements: number;
  };
  progress?: {
    unlocked: number;
    is_platinum: boolean;
    playtime_minutes: number;
  } | null;
  backUrl: string;
}

export default function FlipGameCard({ game, progress, backUrl }: FlipGameCardProps) {
  const unlocked = progress?.unlocked || 0;
  const total = game.total_achievements || 0;
  const pct = total > 0 ? Math.round((unlocked / total) * 100) : 0;
  const isPlat = progress?.is_platinum;
  
  // Converte minutos para horas
  const hours = progress ? Math.floor(progress.playtime_minutes / 60) : 0;

  // Sistema Dinâmico de Raridade com base no progresso do jogador
  let rarityText = "Iniciante";
  let rarityColor = "text-gray-400";
  
  if (isPlat) { rarityText = "Lenda"; rarityColor = "text-cyan-400"; }
  else if (pct >= 80) { rarityText = "Épico"; rarityColor = "text-purple-400"; }
  else if (pct >= 40) { rarityText = "Veterano"; rarityColor = "text-primary"; }
  else if (pct > 0) { rarityText = "Ativo"; rarityColor = "text-green-400"; }

  return (
    <Link 
      href={`/games/${game.id}?back=${encodeURIComponent(backUrl)}`} 
      className="group relative aspect-3/4 w-full block bg-transparent"
      style={{ perspective: '1500px' }}
    >
      <div 
        className="relative w-full h-full transition-transform duration-700 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] shadow-lg group-hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] rounded-2xl group-hover:transform-[rotateY(-180deg)]"
        style={{ transformStyle: 'preserve-3d' }}
      >
        
        {/* =========================================
            FRENTE DA CARTA (Capa Normal)
            ========================================= */}
        <div 
          className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden bg-surface border border-white/5"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <GameCardImage src={game.cover_url} title={game.title} />
          
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-background via-background/80 to-transparent z-10 pointer-events-none"></div>
          <div className="absolute inset-x-0 bottom-0 p-3 z-20 flex flex-col justify-end">
            <h3 className="font-black text-white text-xs md:text-sm line-clamp-2 drop-shadow-md leading-tight group-hover:text-primary transition-colors">
              {game.title}
            </h3>
            {unlocked > 0 && !isPlat && (
               <div className="mt-2 w-full h-1.5 bg-black/60 rounded-full overflow-hidden border border-white/5"><div className="h-full bg-primary" style={{ width: `${pct}%` }}></div></div>
            )}
            {isPlat && (
               <div className="mt-2 w-full h-1.5 bg-cyan-400 rounded-full shadow-[0_0_8px_cyan]"></div>
            )}
          </div>
        </div>

        {/* =========================================
            VERSO DA CARTA (Estatísticas Premium)
            ========================================= */}
        <div 
          className={`absolute inset-0 w-full h-full rounded-2xl overflow-hidden flex flex-col text-center bg-surface border-2 ${isPlat ? 'border-cyan-500/50' : 'border-white/10'}`}
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          
          {/* Fundo do Verso (Capa Desfocada Escura) */}
          {game.cover_url && (
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
              <Image src={game.cover_url} fill alt="" className="object-cover opacity-30 blur-2xl scale-125" unoptimized />
              <div className="absolute inset-0 bg-background/80 mix-blend-overlay"></div>
            </div>
          )}

          {/* Efeito Holográfico de Platina */}
          {isPlat && (
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden rounded-2xl">
              <div className="absolute -inset-[200%] bg-linear-to-tr from-transparent via-cyan-400/20 to-transparent animate-[shimmer_3s_infinite_linear] rotate-45"></div>
              <FaTrophy className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[120px] text-cyan-400 opacity-10 drop-shadow-[0_0_20px_cyan]" />
            </div>
          )}

          {/* Topo do Verso (Título Flexível) */}
          <div className="relative z-10 w-full px-2 pt-3 md:pt-4 pb-1 min-h-12 flex items-center justify-center shrink-0">
            <h4 className="font-black text-white text-[10px] md:text-xs line-clamp-2 w-full drop-shadow-md leading-tight">{game.title}</h4>
          </div>
          
          {/* Centro do Verso (Medalha / Progresso Flexível e Adaptável) */}
          <div className="relative z-10 flex flex-col items-center justify-center flex-1 w-full px-2 overflow-hidden">
            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center mb-1.5 md:mb-2 relative overflow-hidden shrink-0 ${isPlat ? 'bg-cyan-900/40 border border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.5)]' : 'bg-surface/80 border border-white/10 shadow-inner'}`}>
               {isPlat ? <FaTrophy className="text-lg md:text-xl text-cyan-400 animate-pulse drop-shadow-md" /> : <FaGamepad className="text-lg md:text-xl text-gray-400" />}
            </div>

            <p className="text-[7px] md:text-[8px] font-black uppercase tracking-widest text-gray-400 mb-0.5 shrink-0">Conquistas</p>
            <p className={`text-lg md:text-xl font-black leading-none tracking-tight drop-shadow-lg shrink-0 ${isPlat ? 'text-cyan-400' : 'text-white'}`}>
               {unlocked} <span className="text-[10px] md:text-xs text-gray-400 font-bold">/ {total}</span>
            </p>
            
            {/* Barra Neon */}
            <div className="w-full max-w-[70%] mt-2 bg-black/60 h-1.5 md:h-2 rounded-full overflow-hidden border border-white/10 shadow-inner shrink-0">
              <div className={`h-full transition-all duration-1000 relative ${isPlat ? 'bg-cyan-400 shadow-[0_0_10px_cyan]' : 'bg-primary'}`} style={{ width: `${pct}%` }}>
                 {isPlat && <div className="absolute inset-0 bg-white/30 animate-pulse"></div>}
              </div>
            </div>
            <p className="text-[8px] md:text-[9px] mt-1 font-bold text-gray-400 uppercase tracking-widest shrink-0">{pct}%</p>
          </div>

          {/* Base do Verso (Tempo e Raridade colados ao fundo) */}
          <div className="relative z-10 w-full flex items-center justify-between border-t border-white/10 bg-black/40 backdrop-blur-sm px-4 py-2 mt-auto shrink-0">
            <div className="flex flex-col items-center flex-1">
              <FaClock className="text-gray-500 mb-0.5 text-[9px] md:text-[10px]" />
              <span className="text-[9px] md:text-[10px] font-black text-white">{hours}h</span>
            </div>
            <div className="w-px h-5 bg-white/10"></div>
            <div className="flex flex-col items-center flex-1">
              <FaFire className={`${rarityColor} mb-0.5 text-[9px] md:text-[10px] drop-shadow-md`} />
              <span className={`text-[8px] md:text-[9px] font-black ${rarityColor} uppercase tracking-wider`}>{rarityText}</span>
            </div>
          </div>

        </div>
      </div>
    </Link>
  )
}