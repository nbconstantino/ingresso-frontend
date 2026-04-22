'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

interface User {
  _id: string; name: string; email: string
  role: string; ativo: boolean; maxQRCodesPerMonth: number; createdAt: string
}

export default function AdminUsuariosPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return }
    const u = session?.user as { role?: string } | undefined
    if (status === 'authenticated' && u?.role !== 'admin') router.push('/dashboard')
  }, [status, session, router])

  async function load() {
    const res = await fetch('/api/admin/usuarios')
    if (res.ok) setUsers(await res.json())
    setLoading(false)
  }

  useEffect(() => { if (status === 'authenticated') load() }, [status])

  async function update(id: string, data: Partial<User>) {
    await fetch(`/api/admin/usuarios?id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    load()
  }

  if (status === 'loading' || loading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">Carregando...</div>

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <h1 className="text-2xl font-bold text-white">Gerenciar Usuários</h1>
          <Link href="/admin/relatorios" className="text-orange-400 hover:underline text-sm ml-auto">
            Ver Relatórios →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-gray-400 text-sm text-left border-b border-gray-800">
                <th className="pb-3 pr-4">Usuário</th>
                <th className="pb-3 pr-4">Role</th>
                <th className="pb-3 pr-4">Limite QR/mês</th>
                <th className="pb-3 pr-4">Status</th>
                <th className="pb-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {users.map((u) => (
                <tr key={u._id} className="text-sm">
                  <td className="py-3 pr-4">
                    <div className="text-white">{u.name}</div>
                    <div className="text-gray-400 text-xs">{u.email}</div>
                  </td>
                  <td className="py-3 pr-4">
                    <select
                      value={u.role}
                      onChange={(e) => update(u._id, { role: e.target.value as 'admin' | 'user' })}
                      className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-xs"
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="py-3 pr-4">
                    <input
                      type="number"
                      value={u.maxQRCodesPerMonth}
                      onBlur={(e) => update(u._id, { maxQRCodesPerMonth: Number(e.target.value) })}
                      onChange={(e) => setUsers(users.map((x) => x._id === u._id ? { ...x, maxQRCodesPerMonth: Number(e.target.value) } : x))}
                      className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-xs w-20"
                    />
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.ativo ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                      {u.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="py-3">
                    <button
                      onClick={() => update(u._id, { ativo: !u.ativo })}
                      className={`text-xs px-2 py-1 rounded transition-colors ${
                        u.ativo ? 'bg-red-900/50 hover:bg-red-900 text-red-300' : 'bg-green-900/50 hover:bg-green-900 text-green-300'
                      }`}
                    >
                      {u.ativo ? 'Desativar' : 'Ativar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  )
}
