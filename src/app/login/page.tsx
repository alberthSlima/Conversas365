"use client";

import Image from "next/image";
// Substitui componentes de UI por HTML + Tailwind
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    // Lê via FormData (mais confiável com autofill) com fallback no state
    const form = new FormData(e.currentTarget);
    const u = (form.get("username")?.toString() || username || "").trim();
    const p = form.get("password")?.toString() || password || "";

    // Autenticação na API própria (Basic via cookie app_auth)
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: u, password: p }),
    });
    if (res.ok) {
      try {
        const data = await res.json();
        if (data?.user) {
          localStorage.setItem('app_user', JSON.stringify(data.user));
        }
      } catch {}
      setLoading(false);
      router.push('/dashboard');
      router.refresh();
      return;
    }
    setLoading(false);
    alert('Usuário ou senha inválidos');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F1F6FF]">
      <div className="w-full max-w-md shadow-lg border rounded-lg bg-white">
        <div className="flex flex-col items-center gap-2 p-6 border-b">
          <Image
            src="/medeiros365.png"
            alt="365 Logo"
            width={64}
            height={64}
            className="mb-2"
            priority/>
          <h1 className="text-2xl font-semibold text-gray-900 font-sans">Conversas 365</h1>
        </div>
        <div className="p-6">
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="space-y-3">
              <div className="relative w-full">
                <input
                  type="text"
                  name="username"
                  placeholder="usuário"
                  className="h-12 w-full bg-white border border-gray-300 rounded-md px-3 focus:outline-none focus:ring-2 focus:ring-[#0850FD] font-sans"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e)=>setUsername(e.target.value)}
                />
              </div>
              <div className="relative w-full">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Senha"
                  className="h-12 w-full bg-white border border-gray-300 rounded-md pl-3 pr-10 focus:outline-none focus:ring-2 focus:ring-[#0850FD] font-sans"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e)=>setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label="Mostrar/ocultar senha"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
            <button disabled={loading} type="submit" className="h-12 bg-[#0850FD] hover:bg-[#0640CC] text-white font-sans font-medium mt-2 cursor-pointer flex items-center justify-center gap-2 rounded-md">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
} 