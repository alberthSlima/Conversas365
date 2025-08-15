"use client";

import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // Autenticação na API própria (Basic via cookie app_auth)
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
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
      <Card className="w-full max-w-md shadow-lg border-none">
        <CardHeader className="flex flex-col items-center gap-2">
          <Image
            src="/medeiros365.png"
            alt="365 Logo"
            width={64}
            height={64}
            className="mb-2"
            priority
          />
          <CardTitle className="text-2xl font-semibold text-gray-900 font-sans">Conversas 365</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <Input
              type="text"
              placeholder="usuário"
              className="h-12 bg-white border-gray-300 focus:border-[#0850FD] font-sans"
              autoComplete="username"
              required
              value={username}
              onChange={(e)=>setUsername(e.target.value)}
            />
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Senha"
                className="h-12 bg-white border-gray-300 focus:border-[#0850FD] font-sans pr-10"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e)=>setPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center cursor-pointer"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
            <Button disabled={loading} type="submit" className="h-12 bg-[#0850FD] hover:bg-[#0640CC] text-white font-sans font-medium mt-2 cursor-pointer flex items-center justify-center gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 