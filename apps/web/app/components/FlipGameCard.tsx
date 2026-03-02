import Image from "next/image";
import Link from "next/link";
import { memo } from "react"; // 🔥 Importamos o memo
import { FaTrophy, FaGamepad, FaClock, FaFire } from "react-icons/fa";
import GameCardImage from "./GameCardImage";

interface FlipGameCardProps {
  game: {
    id: string;
    title: string;
    cover_url: string | null;
    total_achievements: number;
    console?: string | null;
  };
  progress?: {
    unlocked: number;
    is_platinum: boolean;
    playtime_minutes: number;
  } | null;
  backUrl: string;
}

// 🔥 Envolvemos o componente em memo() para evitar re-renderizações desnecessárias ao arrastar
const FlipGameCard = memo(function FlipGameCard({ game, progress, backUrl }: FlipGameCardProps) {
  const unlocked = progress?.unlocked || 0;
  const total = game.total_achievements || 0;
  const pct = total > 0 ? Math.round((unlocked / total) * 100) : 0;
  const isPlat = progress?.is_platinum;
  
  const hours = progress && progress.playtime_minutes > 0 ? Math.floor(progress.playtime_minutes / 60) : 0;

  let rarityText = "Iniciante";
  let rarityColor = "text-gray-400";
  
  if (isPlat) { rarityText = "Lenda"; rarityColor = "text-cyan-400"; }
  else if (pct >= 80) { rarityText = "Épico"; rarityColor = "text-purple-400"; }
  else if (pct >= 40) { rarityText = "Veterano"; rarityColor = "text-primary"; }
  else if (pct > 0) { rarityText = "Ativo"; rarityColor = "text-green-400"; }

  const consoleTag = game.console || (game.id.startsWith('steam') ? 'PC' : null);

  return (
    <Link 
      href={`/games/${game.id}?back=${encodeURIComponent(backUrl)}`} 
      className="group relative aspect-3/4 w-full block bg-transparent"
      style={{ perspective: '1000px' }}
    >
      <div 
        className="relative w-full h-full transition-transform duration-500 shadow-lg group-hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] rounded-2xl group-hover:transform-[rotateY(-180deg)] will-change-transform"
        style={{ transformStyle: 'preserve-3d' }}
      >
        
        {/* FRENTE */}
        <div className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden bg-surface border border-white/5" style={{ backfaceVisibility: 'hidden' }}>
          {consoleTag && (
            <div className="absolute top-2 left-2 z-30 bg-black/90 text-[9px] md:text-[10px] font-black px-2 py-0.5 md:py-1 rounded-md border border-white/10 shadow-xl text-white uppercase tracking-wider pointer-events-none">
              {consoleTag}
            </div>
          )}

          <GameCardImage src={game.cover_url} title={game.title} />
          
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-background to-transparent z-10 pointer-events-none"></div>
          <div className="absolute inset-x-0 bottom-0 p-3 z-20 flex flex-col justify-end">
            <h3 className="font-black text-white text-xs md:text-sm line-clamp-2 drop-shadow-md leading-tight group-hover:text-primary transition-colors">
              {game.title}
            </h3>
            {unlocked > 0 && !isPlat && (
               <div className="mt-2 w-full h-1.5 bg-black/80 rounded-full overflow-hidden border border-white/5"><div className="h-full bg-primary" style={{ width: `${pct}%` }}></div></div>
            )}
            {isPlat && (
               <div className="mt-2 w-full h-1.5 bg-cyan-400 rounded-full shadow-[0_0_8px_cyan]"></div>
            )}
          </div>
        </div>

        {/* VERSO */}
        <div 
          className={`absolute inset-0 w-full h-full rounded-2xl overflow-hidden flex flex-col text-center bg-surface border-2 ${isPlat ? 'border-cyan-500/50' : 'border-white/10'}`}
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          {game.cover_url && (
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none bg-background">
              <Image src={game.cover_url} fill alt="" sizes="(max-width: 768px) 150px, 200px" className="object-cover opacity-20 blur-sm scale-110" unoptimized />
            </div>
          )}

          {isPlat && (
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden rounded-2xl">
              {/* 🔥 Simplificado o shimmer para consumir menos bateria */}
              <div className="absolute -inset-full bg-linear-to-tr from-transparent via-cyan-400/10 to-transparent animate-[shimmer_4s_infinite_linear] rotate-45"></div>
              <FaTrophy className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-[100px] text-cyan-400 opacity-10" />
            </div>
          )}

          <div className="relative z-10 w-full px-2 pt-3 md:pt-4 pb-1 min-h-12 flex items-center justify-center shrink-0">
            <h4 className="font-black text-white text-[10px] md:text-xs line-clamp-2 w-full drop-shadow-md leading-tight">{game.title}</h4>
          </div>
          
          <div className="relative z-10 flex flex-col items-center justify-center flex-1 w-full px-2 overflow-hidden">
            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center mb-1.5 md:mb-2 relative overflow-hidden shrink-0 ${isPlat ? 'bg-cyan-900/40 border border-cyan-400' : 'bg-surface/90 border border-white/10'}`}>
               {isPlat ? <FaTrophy className="text-lg md:text-xl text-cyan-400" /> : <FaGamepad className="text-lg md:text-xl text-gray-400" />}
            </div>

            <p className="text-[7px] md:text-[8px] font-black uppercase tracking-widest text-gray-400 mb-0.5 shrink-0">Conquistas</p>
            <p className={`text-lg md:text-xl font-black leading-none tracking-tight drop-shadow-lg shrink-0 ${isPlat ? 'text-cyan-400' : 'text-white'}`}>
               {unlocked} <span className="text-[10px] md:text-xs text-gray-400 font-bold">/ {total}</span>
            </p>
            
            <div className="w-full max-w-[70%] mt-2 bg-black/80 h-1.5 md:h-2 rounded-full overflow-hidden border border-white/10 shrink-0">
              <div className={`h-full relative ${isPlat ? 'bg-cyan-400' : 'bg-primary'}`} style={{ width: `${pct}%` }}></div>
            </div>
            <p className="text-[8px] md:text-[9px] mt-1 font-bold text-gray-400 uppercase tracking-widest shrink-0">{pct}%</p>
          </div>

          <div className="relative z-10 w-full flex items-center justify-center border-t border-white/10 bg-black/60 px-4 py-2 mt-auto shrink-0 gap-4">
            {hours > 0 && (
              <>
                <div className="flex flex-col items-center flex-1">
                  <FaClock className="text-gray-500 mb-0.5 text-[9px] md:text-[10px]" />
                  <span className="text-[9px] md:text-[10px] font-black text-white">{hours}h</span>
                </div>
                <div className="w-px h-5 bg-white/10"></div>
              </>
            )}
            <div className="flex flex-col items-center flex-1">
              <FaFire className={`${rarityColor} mb-0.5 text-[9px] md:text-[10px]`} />
              <span className={`text-[8px] md:text-[9px] font-black ${rarityColor} uppercase tracking-wider`}>{rarityText}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
});

export default FlipGameCard;