import Image from "next/image";
import SpoilerTag from "./SpoilerTag";

export default function TextFormatter({ content }: { content: string }) {
  if (!content) return null;

  // Regex poderoso que divide o texto em 3 coisas: Imagens, Spoilers e Texto Normal
  const parts = content.split(/(!\[.*?\]\(.*?\)|\|\|.*?\|\|)/g);
  
  return (
    <>
      {parts.map((part, index) => {
        if (!part) return null;

        // 1. É uma imagem Markdown? ![alt](url)
        const imgMatch = part.match(/^!\[(.*?)\]\((.*?)\)$/);
        
        // 🔥 CORREÇÃO TYPESCRIPT: Garante que a URL (imgMatch[2]) existe!
        if (imgMatch && imgMatch[2]) {
          return (
            <div key={index} className="relative w-full aspect-video my-6">
              <Image 
                src={imgMatch[2]} 
                alt={imgMatch[1] || 'Imagem anexa'} 
                fill 
                className="rounded-2xl border border-white/5 shadow-2xl object-contain bg-black/50" 
                unoptimized 
              />
            </div>
          );
        }
        
        // 2. É um Spoiler? ||texto escondido||
        const spoilerMatch = part.match(/^\|\|(.*?)\|\|$/);
        
        // 🔥 CORREÇÃO TYPESCRIPT: Garante que o texto (spoilerMatch[1]) existe!
        if (spoilerMatch && spoilerMatch[1]) {
          return <SpoilerTag key={index} text={spoilerMatch[1]} />;
        }

        // 3. É apenas Texto Normal
        return <span key={index}>{part}</span>;
      })}
    </>
  );
}