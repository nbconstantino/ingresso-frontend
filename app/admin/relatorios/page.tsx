'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

interface PorUsuario { userId: string; nome: string; email: string; total: number; pagos: number }
interface PorEvento { _id: string; nomeEvento: string; total: number; pagos: number }

export default function RelatoriosPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [mes, setMes] = useState(() => new Date().toISOString().slice(0, 7))
  const [porUsuario, setPorUsuario] = useState<PorUsuario[]>([])
  const [porEvento, setPorEvento] = useState<PorEvento[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return }
    const u = session?.user as { role?: string } | undefined
    if (status === 'authenticated' && u?.role !== 'admin') router.push('/dashboard')
  }, [status, session, router])

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/admin/relatorios?mes=${mes}`)
    if (res.ok) {
      const data = await res.json()
      setPorUsuario(data.porUsuario ?? [])
      setPorEvento(data.porEvento ?? [])
    }
    setLoading(false)
  }

  useEffect(() => { if (status === 'authenticated') load() }, [status, mes])

  if (status === 'loading') return <div className="min-h-screen bg-gray-950" />

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-6">
          <h1 className="text-2xl font-bold text-white">Relatórios</h1>
          <Link href="/admin/usuarios" className="text-orange-400 hover:underline text-sm ml-auto">
            ← Usuários
          </Link>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <label className="text-gray-400 text-sm">Mês:</label>
          <input
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-orange-500"
          />
        </div>

        {loading ? (
          <p className="text-gray-400">Carregando...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-lg font-semibold text-white mb-3">Por Usuário</h2>
              {porUsuario.length === 0 ? (
                <p className="text-gray-500 text-sm">Nenhum dado para este mês.</p>
              ) : (
                <div className="space-y-2">
                  {porUsuario.map((u) => (
                    <div key={u.userId} className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 flex items-center justify-between">
                      <div>
                        <div className="text-white text-sm font-medium">{u.nome}</div>
                        <div className="text-gray-400 text-xs">{u.email}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-orange-400 font-bold">{u.total}</div>
                        <div className="text-green-400 text-xs">{u.pagos} pagos</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h2 className="text-lg font-semibold text-white mb-3">Por Evento</h2>
              {porEvento.length === 0 ? (
                <p className="text-gray-500 text-sm">Nenhum dado para este mês.</p>
              ) : (
                <div className="space-y-2">
                  {porEvento.map((e) => (
                    <div key={e._id} className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 flex items-center justify-between">
                      <div className="text-white text-sm font-medium pr-4">{e.nomeEvento}</div>
                      <div className="text-right shrink-0">
                        <div className="text-orange-400 font-bold">{e.total}</div>
                        <div className="text-green-400 text-xs">{e.pagos} pagos</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
