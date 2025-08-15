"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

function initials(email?: string) {
  return email ? email.slice(0, 2).toUpperCase() : "US";
}

export default function Header() {
  const [displayName, setDisplayName] = useState<string>('Usuário');

  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('app_user') : null;
      if (raw) {
        const u = JSON.parse(raw) as { id?: number; username?: string; role?: string };
        if (u?.username) setDisplayName(u.username);
      }
    } catch {}
  }, []);
  const router = useRouter();

  async function handleLogout() {
    // encerra sessão custom
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <Image src="/medeiros365.png" alt="Logo" width={56} height={56} priority />

        {/* Navegação (placeholder) */}
        <nav className="flex items-center gap-6 ml-8">
          <a href="/dashboard" className="text-[#0850FD] font-medium font-sans">
            Mensagens
          </a>
        </nav>

        {/* Perfil */}
        <Popover>
          <PopoverTrigger asChild>
            <Avatar className="h-8 w-8 cursor-pointer">
              <AvatarFallback className="bg-[#F1F6FF] text-[#0850FD] text-sm font-medium">
                {initials('user')}
              </AvatarFallback>
            </Avatar>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-4">
            <div className="space-y-3">
              <div>
                <p className="font-medium text-gray-900 break-all">{displayName}</p>
              </div>
              <Button
                variant="outline"
                className="w-full bg-red-50 border-red-200 text-red-600 hover:bg-red-100 cursor-pointer"
                onClick={handleLogout}
              >
                Logout
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
} 