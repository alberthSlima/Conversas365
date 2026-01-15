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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl border-2 border-gray-200 overflow-hidden">
          {/* Header com gradiente */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-10 text-center">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 bg-white rounded-2xl p-3 shadow-lg">
                <Image
                  src="/medeiros365.png"
                  alt="365 Logo"
                  width={64}
                  height={64}
                  className="w-full h-full object-contain"
                  priority
                />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Conversas 365</h1>
            <p className="text-blue-100 text-sm">Gestão de Mensagens WhatsApp</p>
          </div>

          <div className="p-8">
            <form className="space-y-5" onSubmit={handleSubmit}>
              {/* Campo Usuário */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Usuário
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    name="username"
                    placeholder="Digite seu usuário"
                    className="h-13 w-full bg-gray-50 border-2 border-gray-300 rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    autoComplete="username"
                    required
                    value={username}
                    onChange={(e)=>setUsername(e.target.value)}
                  />
                </div>
              </div>

              {/* Campo Senha */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Senha
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="Digite sua senha"
                    className="h-13 w-full bg-gray-50 border-2 border-gray-300 rounded-xl pl-12 pr-12 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e)=>setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-4 flex items-center cursor-pointer hover:scale-110 transition-transform"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Mostrar/ocultar senha"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Botão de Login */}
              <button 
                disabled={loading} 
                type="submit" 
                className="w-full h-13 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-lg mt-6 rounded-xl flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading && <Loader2 className="h-5 w-5 animate-spin" />}
                {loading ? "Entrando..." : "Entrar"}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                © 2026 Conversas 365. Todos os direitos reservados.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 