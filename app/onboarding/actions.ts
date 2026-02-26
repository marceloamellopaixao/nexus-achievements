'use server'

import { createClient } from "@/utils/supabase/server";

export async function updateNickname(username: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return { error: "Sessão expirada. Faça login novamente." };

  // Validação: Só letras, números e underline, entre 3 e 20 caracteres
  const isValid = /^[a-zA-Z0-9_]{3,20}$/.test(username);
  if (!isValid) {
    return { error: "O nickname deve ter entre 3 e 20 caracteres, sem espaços ou símbolos especiais." };
  }

  // Verifica se alguém já roubou este nickname
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('username', username)
    .maybeSingle();

  if (existingUser && existingUser.id !== user.id) {
    return { error: "Este nickname já está em uso por outro caçador." };
  }

  // Atualiza o utilizador
  const { error } = await supabase
    .from('users')
    .update({ username: username })
    .eq('id', user.id);

  if (error) {
    return { error: "Erro ao salvar o nickname. Tente novamente." };
  }

  return { success: true };
}