"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { User } from "@supabase/supabase-js";

interface AuthCtx {
  user: User | null;
  signIn: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be within AuthProvider");
  return ctx;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string): Promise<boolean> {
    // retry simples para contornar 504 (projeto acordando/rede instável)
    type SupabaseAuthError = { status?: number; message: string };
    let lastErr: SupabaseAuthError | null = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error) {
        const { data: sess } = await supabase.auth.getSession();
        const nextUser = data.user ?? sess.session?.user ?? null;
        setUser(nextUser);
        return Boolean(sess.session);
      }
      lastErr = error as SupabaseAuthError;
      if ((error as SupabaseAuthError)?.status === 504 || /timeout|network/i.test(error.message)) {
        await new Promise(r => setTimeout(r, 1500));
        continue;
      }
      break;
    }
    alert(lastErr?.message ?? 'Falha ao autenticar. Tente novamente.');
    return false;
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ user, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
} 