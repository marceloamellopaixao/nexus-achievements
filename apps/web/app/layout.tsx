import type { Metadata } from "next";
import "./globals.css";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import Image from "next/image";
import { ToastContainer } from "react-toastify";

export const metadata: Metadata = {
  title: "Nexus Achievements",
  description: "O seu hub definitivo de conquistas gamer.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Inicializa o cliente Supabase no servidor
  const supabase = await createClient();

  // Busca a sessão do usuário logado (se houver)
  const { data: { user } } = await supabase.auth.getUser();

  let userData = null;

  // Se estiver logado, busca os dados do usuário na tabela "users"
  if (user) {
    const { data } = await supabase
      .from("users")
      .select("username, avatar_url, nexus_coins")
      .eq("id", user.id)
      .single(); // Busca os dados do usuário logado usando o ID da sessão

    userData = data; // Armazena os dados do usuário para uso posterior (ex: exibir nome, avatar, etc.)
    // console.log("Dados do usuário logado:", userData); // Loga os dados do usuário para verificação
  }

  return (
    <html lang="pt-BR" className="dark">
      <body className="antialiased flex h-screen overflow-hidden bg-background text-foreground">

        {/* SIDEBAR */}
        <aside className="w-64 border-r border-border bg-surface hidden md:flex flex-col">
          <div className="h-16 flex items-center px-6 border-b border-border">
            <h1 className="text-xl font-bold text-transparent bg-clip-text bg-linear-to-r from-primary to-blue-500">
              NEXUS
            </h1>
          </div>
          <nav className="flex-1 p-4 space-y-2">
            <Link href="/dashboard" className="block px-4 py-2 rounded-md hover:bg-white/5 transition-colors">
              🏠 Início
            </Link>
            <Link href="/profile" className="block px-4 py-2 rounded-md hover:bg-white/5 transition-colors">
              🎮 Meu Perfil
            </Link>
            <Link href="/shop" className="block px-4 py-2 rounded-md hover:bg-white/5 transition-colors text-primary font-medium">
              🛒 Loja de Pontos
            </Link>
            <Link href="/integrations" className="block px-4 py-2 rounded-md hover:bg-white/5 transition-colors mt-4 border-t border-border pt-4">
              🔗 Integrações
            </Link>
          </nav>
        </aside>

        {/* ÁREA PRINCIPAL */}
        <div className="flex-1 flex flex-col h-screen">

          {/* TOPBAR */}
          <header className="h-16 border-b border-border bg-surface/50 backdrop-blur flex items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-400">Hub Global</span>
            </div>

            {/* DADOS DINÂMICOS DO USUÁRIO */}
            <div className="flex items-center gap-4">
              {userData && (
                <div className="flex items-center gap-2 bg-background px-3 py-1 rounded-full border border-border shadow-sm">
                  <span className="text-yellow-500 text-sm">🪙</span>
                  <span className="text-sm font-bold">{userData.nexus_coins}</span>
                </div>
              )}

              {userData?.avatar_url ? (
                <Image
                  src={userData.avatar_url}
                  alt={userData.username}
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-full border border-primary object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary flex items-center justify-center text-sm font-bold uppercase">
                  {userData?.username ? userData.username.charAt(0) : "U"}
                </div>
              )}

              {/* BOTÃO DE LOGOUT */}
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="ml-2 px-3 py-1.5 text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-md transition-colors"
                >
                  Sair
                </button>
              </form>
            </div>
          </header>

          {/* CONTEÚDO DA PÁGINA */}
          <main className="flex-1 overflow-y-auto p-6">
            <ToastContainer 
              closeOnClick
              pauseOnHover
              draggable
              theme="dark"
            />
            {children}
          </main>
        </div>

      </body>
    </html>
  );
}