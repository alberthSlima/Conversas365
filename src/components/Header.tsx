"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function initials(nameOrEmail?: string) {
  if (!nameOrEmail) return "US";
  const s = nameOrEmail.trim();
  if (!s) return "US";
  const parts = s.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return s.slice(0,2).toUpperCase();
}

export default function Header() {
  const [displayName, setDisplayName] = useState<string>('Usuário');
  const [role, setRole] = useState<string | undefined>(undefined);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('app_user') : null;
      if (raw) {
        const u = JSON.parse(raw) as { id?: number; username?: string; role?: string };
        if (u?.username) setDisplayName(u.username);
        if (u?.role) setRole(u.role);
      }
    } catch {}
  }, []);
  const router = useRouter();

  async function handleLogout() {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
    router.replace("/login");
    router.refresh();
  }

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <Image src="/medeiros365.png" alt="Logo" width={56} height={56} priority style={{ height: 'auto', width: '56px' }} />

        {/* Navegação */}
        <nav className="flex items-center gap-6 ml-8">
          <a href="/dashboard" className="text-[#0850FD] font-medium font-sans">
            Mensagens
          </a>
          {String(role).toLowerCase() === 'admin' && (
            <a href="/users" className="text-[#0850FD] font-medium font-sans">
              Usuários
            </a>
          )}
        </nav>

        {/* Perfil */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="h-8 w-8 rounded-full bg-[#F1F6FF] text-[#0850FD] text-sm font-medium flex items-center justify-center"
            title={displayName}
          >
            {initials(displayName)}
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 rounded-md border bg-white shadow-md p-3" role="menu">
              <p className="font-medium text-gray-900 break-all mb-2">{displayName}</p>
              <button type="button" onClick={handleLogout} className="w-full px-3 py-1.5 border rounded-md text-sm bg-red-50 border-red-200 text-red-600 hover:bg-red-100">Logout</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}


