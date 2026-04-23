'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

interface User {
  _id: string; name: string; email: string
  role: string; ativo: boolean; maxQRCodesPerMonth: number
}
interface Convite {
  _id: string; codigo: string; usado: boolean; expiresAt: string; createdAt: string
}
interface EditForm { name: string; email: string; role: string; maxQRCodesPerMonth: number; newPassword: string }

export default function AdminUsuariosPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [convites, setConvites] = useState<Convite[]>([])
  const [editando, setEditando] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ name: '', email: '', role: 'user', maxQRCodesPerMonth: 50, newPassword: '' })
  const [tab, setTab] = useState<'usuarios' | 'convites'>('usuarios')
  const [copied, setCopied] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return }
    if (status === 'authenticated' && (session?.user as { role?: string })?.role !== 'admin') router.push('/dashboard')
  }, [status, session, router])

  const load = useCallback(async () => {
    const [u, c] = await Promise.all([
      fetch('/api/admin/usuarios').then(r => r.json()),
      fetch('/api/admin/convites').then(r => r.json()),
    ])
    setUsers(Array.isArray(u) ? u : [])
    setConvites(Array.isArray(c) ? c : [])
  }, [])

  useEffect(() => { if (status === 'authenticated') load() }, [status, load])

  async function toggleAtivo(id: string, ativo: boolean) {
    await fetch(`/api/admin/usuarios?id=${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: !ativo }),
    })
    load()
  }

  function startEdit(u: User) {
    setEditando(u._id)
    setEditForm({ name: u.name, email: u.email, role: u.role, maxQRCodesPerMonth: u.maxQRCodesPerMonth, newPassword: '' })
  }

  async function saveEdit(id: string) {
    const body: Record<string, unknown> = {
      name: editForm.name, email: editForm.email,
      role: editForm.role, maxQRCodesPerMonth: editForm.maxQRCodesPerMonth,
    }
    if (editForm.newPassword) body.newPassword = editForm.newPassword

    const res = await fetch(`/api/admin/usuarios?id=${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (res.ok) { setEditando(null); load(); setMsg('Usuário atualizado!') }
    else { const d = await res.json(); setMsg(`Erro: ${d.error}`) }
    setTimeout(() => setMsg(''), 3000)
  }

  async function gerarConvite() {
    const res = await fetch('/api/admin/convites', { method: 'POST' })
    if (res.ok) { load(); setMsg('Convite gerado!'); setTimeout(() => setMsg(''), 3000) }
  }

  async function revogarConvite(id: string) {
    await fetch(`/api/admin/convites?id=${id}`, { method: 'DELETE' })
    load()
  }

  async function copiarCodigo(codigo: string) {
    await navigator.clipboard.writeText(codigo)
    setCopied(codigo); setTimeout(() => setCopied(null), 2000)
  }

  if (status === 'loading') return <div className="min-h-screen t-bg" />

  return (
    <div className="min-h-screen t-bg">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <h1 className="text-2xl font-bold text-white">Administração</h1>
          <Link href="/admin/relatorios" className="text-orange-400 hover:underline text-sm ml-auto">Ver Relatórios →</Link>
        </div>

        {msg && (
          <div className={`mb-4 px-4 py-2 rounded-lg text-sm border ${msg.startsWith('Erro') ? 'bg-red-900/30 text-red-300 border-red-800' : 'bg-green-900/30 text-green-300 border-green-800'}`}>
            {msg}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          {(['usuarios', 'convites'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${tab === t ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
              {t === 'usuarios' ? `👤 Usuários (${users.length})` : `🎟️ Convites (${convites.filter(c => !c.usado).length} ativos)`}
            </button>
          ))}
        </div>

        {/* Usuários */}
        {tab === 'usuarios' && (
          <div className="space-y-3">
            {users.map(u => (
              <div key={u._id} className="t-card border rounded-xl p-4">
                {editando === u._id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { key: 'name', label: 'Nome', type: 'text' },
                        { key: 'email', label: 'Email', type: 'email' },
                      ].map(f => (
                        <div key={f.key}>
                          <label className="block text-xs text-gray-400 mb-1">{f.label}</label>
                          <input type={f.type} value={editForm[f.key as keyof EditForm]}
                            onChange={e => setEditForm({ ...editForm, [f.key]: e.target.value })}
                            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-orange-500" />
                        </div>
                      ))}
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Role</label>
                        <select value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                          className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-orange-500">
                          <option value="user">user</option>
                          <option value="admin">admin</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Limite QR/mês</label>
                        <input type="number" value={editForm.maxQRCodesPerMonth}
                          onChange={e => setEditForm({ ...editForm, maxQRCodesPerMonth: Number(e.target.value) })}
                          className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-orange-500" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs text-gray-400 mb-1">Nova Senha (deixe vazio para não alterar)</label>
                        <input type="password" value={editForm.newPassword}
                          onChange={e => setEditForm({ ...editForm, newPassword: e.target.value })}
                          placeholder="••••••••"
                          className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-orange-500 placeholder-gray-600" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => saveEdit(u._id)}
                        className="bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1.5 rounded transition-colors">Salvar</button>
                      <button onClick={() => setEditando(null)}
                        className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-3 py-1.5 rounded transition-colors">Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium">{u.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${u.role === 'admin' ? 'bg-purple-900 text-purple-300' : 'bg-gray-700 text-gray-300'}`}>{u.role}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${u.ativo ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>{u.ativo ? 'Ativo' : 'Inativo'}</span>
                      </div>
                      <div className="text-gray-400 text-sm mt-0.5">{u.email}</div>
                      <div className="t-text3 text-xs mt-0.5">Limite: {u.maxQRCodesPerMonth} QR/mês</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => startEdit(u)}
                        className="bg-blue-700 hover:bg-blue-600 text-white text-xs px-2 py-1.5 rounded transition-colors">✏️ Editar</button>
                      <button onClick={() => toggleAtivo(u._id, u.ativo)}
                        className={`text-xs px-2 py-1.5 rounded transition-colors ${u.ativo ? 'bg-red-900/50 hover:bg-red-900 text-red-300' : 'bg-green-900/50 hover:bg-green-900 text-green-300'}`}>
                        {u.ativo ? 'Desativar' : 'Ativar'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Convites */}
        {tab === 'convites' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-400 text-sm">Gere um código para enviar a um novo usuário. O código expira em 7 dias e pode ser usado apenas uma vez.</p>
              <button onClick={gerarConvite}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shrink-0 ml-4">
                + Gerar Código
              </button>
            </div>

            {convites.length === 0 ? (
              <div className="text-center py-12 text-gray-500">Nenhum convite gerado ainda.</div>
            ) : (
              <div className="space-y-2">
                {convites.map(c => (
                  <div key={c._id} className={`bg-gray-900 border rounded-xl px-4 py-3 flex items-center justify-between ${c.usado ? 'border-gray-800 opacity-50' : 'border-gray-700'}`}>
                    <div className="flex items-center gap-4">
                      <span className={`font-mono text-lg font-bold tracking-widest ${c.usado ? 'text-gray-500 line-through' : 'text-orange-400'}`}>
                        {c.codigo}
                      </span>
                      <div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${c.usado ? 'bg-gray-800 text-gray-400' : 'bg-green-900 text-green-300'}`}>
                          {c.usado ? 'Usado' : 'Disponível'}
                        </span>
                        <div className="t-text3 text-xs mt-0.5">
                          Expira: {new Date(c.expiresAt).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </div>
                    {!c.usado && (
                      <div className="flex gap-2">
                        <button onClick={() => copiarCodigo(c.codigo)}
                          className={`text-xs px-3 py-1.5 rounded transition-colors ${copied === c.codigo ? 'bg-green-700 text-green-100' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}>
                          {copied === c.codigo ? '✓ Copiado' : '📋 Copiar'}
                        </button>
                        <button onClick={() => revogarConvite(c._id)}
                          className="text-xs px-2 py-1.5 rounded bg-red-900/40 hover:bg-red-900 text-red-300 transition-colors">
                          Revogar
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
