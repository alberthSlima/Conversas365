"use client";

import Header from "@/components/Header";
import { useEffect, useMemo, useState } from "react";

type UserItem = { id?: number; username?: string; role?: string | number };

export default function UsersPage() {
  const [items, setItems] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [size] = useState(10);
  const [username, setUsername] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("");
  const [desc, setDesc] = useState<boolean>(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<number>(2);
  const [creating, setCreating] = useState(false);
  const [totalItems, setTotalItems] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editRole, setEditRole] = useState<number>(2);
  const [editPassword, setEditPassword] = useState<string>("");
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  const canAccess = useMemo(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('app_user') : null;
      if (!raw) return false;
      const u = JSON.parse(raw) as { role?: string };
      return String(u?.role || '').toLowerCase() === 'admin';
    } catch { return false; }
  }, []);

  useEffect(() => {
    if (!canAccess) return;
    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ pageNumber: String(page), pageSize: String(size) });
        if (username) params.set('username', username);
        if (roleFilter) params.set('role', roleFilter);
        if (sortBy) params.set('sortBy', sortBy);
        if (desc) params.set('desc', 'true');
        const res = await fetch(`/api/users?${params.toString()}`, { cache: 'no-store' });
        const data = await res.json().catch(() => []);
        const list: UserItem[] = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
        const pickTotal = (obj: Record<string, unknown>): number | null => {
          const cands = ['totalItems','total','totalCount','count','totalElements'];
          for (const k of cands) {
            const v = (obj as Record<string, unknown>)[k];
            if (typeof v === 'number' && Number.isFinite(v)) return v;
          }
          return null;
        };
        setTotalItems((data && typeof data === 'object') ? pickTotal(data as Record<string, unknown>) : null);
        setItems(list);
      } catch {}
      finally { setLoading(false); }
    })();
  }, [page, size, username, roleFilter, sortBy, desc, canAccess]);

  function roleLabel(role: string | number | undefined): string {
    if (typeof role === 'number') return role === 1 ? 'Administrador' : 'Padrão';
    const r = String(role || '').toLowerCase();
    if (r === '1' || r === 'admin' || r === 'administrador') return 'Administrador';
    if (r === '2' || r === 'padrao' || r === 'padrão' || r === 'user' || r === 'standard') return 'Padrão';
    return role ? String(role) : '-';
  }

  async function handleCreate() {
    if (!newUsername || !newPassword) return;
    setCreating(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ username: newUsername, password: newPassword, role: Number(newRole) }),
      });
      if (res.ok) {
        setNewUsername('');
        setNewPassword('');
        setNewRole(2);
        setPage(1);
        // refresh list
        const params = new URLSearchParams({ pageNumber: '1', pageSize: String(size) });
        const r = await fetch(`/api/users?${params.toString()}`, { cache: 'no-store' });
        const data = await r.json().catch(() => []);
        const list: UserItem[] = Array.isArray(data?.items) ? data.items : (Array.isArray(data) ? data : []);
        setItems(list);
      }
    } catch {}
    finally { setCreating(false); }
  }

  function beginEdit(u: UserItem) {
    setEditingId(u.id ?? null);
    const r = typeof u.role === 'number' ? u.role : (String(u.role || '').toLowerCase() === 'admin' ? 1 : 2);
    setEditRole(r as number);
    setEditPassword('');
  }

  function cancelEdit() {
    setEditingId(null);
    setEditPassword('');
  }

  async function saveEdit() {
    if (editingId == null) return;
    setSavingEdit(true);
    try {
      const body: Record<string, unknown> = { role: Number(editRole) };
      if (editPassword) body.password = editPassword;
      const res = await fetch(`/api/users/${encodeURIComponent(String(editingId))}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setItems(curr => curr.map(u => (u.id === editingId ? { ...u, role: Number(editRole) } : u)));
        cancelEdit();
      }
    } catch {}
    finally { setSavingEdit(false); }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="p-6">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold">Cadastrar usuário</h2>
              {typeof totalItems === 'number' && (
                <span className="text-sm text-gray-600">Total: {totalItems}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-3 mb-6 items-end">
              <div>
                <label className="block text-xs text-gray-600">Username</label>
                <input value={newUsername} onChange={(e)=>setNewUsername(e.target.value)} className="border rounded-md px-3 py-2 text-sm" placeholder="usuario" />
              </div>
              <div>
                <label className="block text-xs text-gray-600">Senha</label>
                <input type="password" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} className="border rounded-md px-3 py-2 text-sm" placeholder="••••••" />
              </div>
              <div>
                <label className="block text-xs text-gray-600">Perfil</label>
                <select value={newRole} onChange={(e)=>setNewRole(Number(e.target.value))} className="border rounded-md px-3 py-2 text-sm">
                  <option value={1}>Administrador</option>
                  <option value={2}>Padrão</option>
                </select>
              </div>
              <button disabled={creating || !newUsername || !newPassword} onClick={handleCreate} className="px-3 py-2 border rounded-md text-sm bg-blue-50 border-blue-200 text-blue-700 disabled:opacity-50">
                {creating ? 'Salvando...' : 'Cadastrar'}
              </button>
            </div>
            <div className="flex flex-wrap gap-3 mb-4 items-end">
              <div className="flex-1 min-w-52">
                <label className="block text-xs text-gray-600">Username</label>
                <input value={username} onChange={(e)=>setUsername(e.target.value)} placeholder="Filtrar por username" className="border rounded-md px-3 py-2 text-sm w-full" />
              </div>
              <div>
                <label className="block text-xs text-gray-600">Perfil</label>
                <select value={roleFilter} onChange={(e)=>setRoleFilter(e.target.value)} className="border rounded-md px-3 py-2 text-sm">
                  <option value="">--</option>
                  <option value="1">Administrador</option>
                  <option value="2">Padrão</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600">Ordenar por</label>
                <select value={sortBy} onChange={(e)=>setSortBy(e.target.value)} className="border rounded-md px-3 py-2 text-sm">
                  <option value="">--</option>
                  <option value="id">id</option>
                  <option value="username">username</option>
                  <option value="role">role</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600">Desc</label>
                <select value={desc ? 'true' : 'false'} onChange={(e)=>setDesc(e.target.value==='true')} className="border rounded-md px-3 py-2 text-sm">
                  <option value="false">false</option>
                  <option value="true">true</option>
                </select>
              </div>
              <button onClick={()=>{ setPage(1); }} className="px-3 py-2 border rounded-md text-sm">Aplicar</button>
            </div>
            {loading ? (
              <p>Carregando...</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600">
                    <th className="py-2">ID</th>
                    <th className="py-2">Username</th>
                    <th className="py-2">Perfil</th>
                    <th className="py-2">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((u, idx) => (
                    <tr key={`${u.username}-${idx}`} className="border-t">
                      <td className="py-2">{u.id ?? '-'}</td>
                      <td className="py-2">{u.username ?? '-'}</td>
                      <td className="py-2">
                        {editingId === u.id ? (
                          <select value={editRole} onChange={(e)=>setEditRole(Number(e.target.value))} className="border rounded-md px-2 py-1 text-sm">
                            <option value={1}>Administrador</option>
                            <option value={2}>Padrão</option>
                          </select>
                        ) : (
                          roleLabel(u.role)
                        )}
                      </td>
                      <td className="py-2">
                        {editingId === u.id ? (
                          <div className="flex items-center gap-2">
                            <input type="password" placeholder="Nova senha (opcional)" value={editPassword} onChange={(e)=>setEditPassword(e.target.value)} className="border rounded-md px-2 py-1 text-sm" />
                            <button disabled={savingEdit} onClick={saveEdit} className="px-2 py-1 border rounded text-sm bg-green-50 border-green-200 text-green-700 disabled:opacity-50">{savingEdit ? 'Salvando...' : 'Salvar'}</button>
                            <button onClick={cancelEdit} className="px-2 py-1 border rounded text-sm">Cancelar</button>
                          </div>
                        ) : (
                          <button onClick={()=>beginEdit(u)} className="px-2 py-1 border rounded text-sm">Editar</button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr><td colSpan={4} className="py-4 text-center text-gray-500">Nenhum usuário encontrado.</td></tr>
                  )}
                </tbody>
              </table>
            )}
            <div className="flex items-center gap-3 mt-4">
              <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="px-3 py-1.5 border rounded disabled:opacity-50">Anterior</button>
              <span>Página {page}</span>
              <button disabled={typeof totalItems==='number' ? page*size >= totalItems : false} onClick={()=>setPage(p=>p+1)} className="px-3 py-1.5 border rounded disabled:opacity-50">Próxima</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}


