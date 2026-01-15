"use client";

import Image from "next/image";
import Link from "next/link";
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
    <header className="bg-white/80 backdrop-blur-md border-b-2 border-gray-200 px-6 py-4 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Image src="/medeiros365.png" alt="Logo" width={56} height={56} priority style={{ height: 'auto', width: '56px' }} className="drop-shadow-md" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Conversas365
            </h1>
            <p className="text-xs text-gray-500">Gestão de Mensagens</p>
          </div>
        </div>

        {/* Navegação */}
        <nav className="flex items-center gap-2">
          <Link 
            href="/dashboard" 
            className="group flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-700 hover:text-blue-700 hover:bg-blue-50 transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <span className="hidden sm:inline">Mensagens</span>
          </Link>
          <Link 
            href="/templates" 
            className="group flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-700 hover:text-blue-700 hover:bg-blue-50 transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <span className="hidden sm:inline">Templates</span>
          </Link>
          {String(role).toLowerCase() === 'admin' && (
            <Link 
              href="/users" 
              className="group flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-700 hover:text-blue-700 hover:bg-blue-50 transition-all duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span className="hidden sm:inline">Usuários</span>
            </Link>
          )}
        </nav>

        {/* Perfil */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-sm font-bold flex items-center justify-center hover:shadow-lg hover:scale-105 transition-all duration-200"
            title={displayName}
          >
            {initials(displayName)}
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-3 w-64 rounded-2xl border-2 border-gray-200 bg-white shadow-2xl p-4 animate-fadeIn" role="menu">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b-2 border-gray-100">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white text-base font-bold flex items-center justify-center">
                  {initials(displayName)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 truncate">{displayName}</p>
                  {role && <p className="text-xs text-gray-500 capitalize">{role}</p>}
                </div>
              </div>
              <button 
                type="button" 
                onClick={handleLogout} 
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-200 text-red-600 hover:from-red-100 hover:to-rose-100 transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}


