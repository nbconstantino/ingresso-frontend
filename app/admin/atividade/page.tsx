'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import Navbar from '@/components/Navbar'

interface Log { _id: string; userName: string; acao: string; detalhes: string; createdAt: string }

const ACAO_CONFIG: Record<string, { icone: string; label: string; cor: string }> = {
  'criar_evento':             { icone: '🎟️', label: 'Criou evento', cor: 'text-blue-400' },
  'iniciar_bot':              { icone: '▶️', label: 'Iniciou bot', cor: 'text-green-400' },
  'criar_conta':              { icone: '👤', label: 'Criou conta', cor: 'text-purple-400' },
  'login':                    { icone: '🔐', label: 'Login', cor: 'text-gray-400' },
  'solicitar_exclusao_evento':{ icone: '🗑️', label: 'Solicitou exclusão', cor: 'text-red-400' },
  'aprovar_exclusao_evento':  { icone: '✅', label: 'Aprovou exclusão', cor: 'text-orange-400' },
  'deletar_evento':           { icone: '🗑️', label: 'Deletou evento', cor: 'text-red-500' },
}

export default function AtividadePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [logs, setLogs] = useState<Log[]>([])
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [busca, setBusca] = useState('')

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return }
    if (status === 'authenticated' && (session?.user as { role?: string })?.role !== 'admin') router.push('/dashboard')
  }, [status, session, router])

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/atividade?page=${page}`)
    if (res.ok) {
      const data = await res.json()
      setLogs(data.logs ?? [])
      setPages(data.pages ?? 1)
      setTotal(data.total ?? 0)
    }
    setLoading(false)
  }, [page])

  useEffect(() => { if (status === 'authenticated') load() }, [status, load])

  const filtrados = busca ? logs.filter(l =>
    l.userName.toLowerCase().includes(busca.toLowerCase()) ||
    l.acao.toLowerCase().includes(busca.toLowerCase()) ||
    l.detalhes.toLowerCase().includes(busca.toLowerCase())
  ) : logs

  if (status === 'loading') return <div className="min-h-screen t-bg" />

  return (
    <div className="min-h-screen t-bg">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold t-text">Log de Atividade</h1>
            <p className="t-text2 text-sm mt-1">{total} registros no total</p>
          </div>
          <input value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar usuário, ação..."
            className="t-input border rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:border-orange-500" />
        </div>

        {loading ? (
          <div className="text-center py-12 t-text3">Carregando...</div>
        ) : filtrados.length === 0 ? (
          <div className="text-center py-12 t-text3">Nenhum registro encontrado.</div>
        ) : (
          <div className="t-card border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead><tr className="t-bg2 border-b t-border">
                <th className="text-left px-5 py-3 t-text2 text-xs font-medium">Quando</th>
                <th className="text-left px-4 py-3 t-text2 text-xs font-medium">Usuário</th>
                <th className="text-left px-4 py-3 t-text2 text-xs font-medium">Ação</th>
                <th className="text-left px-4 py-3 t-text2 text-xs font-medium">Detalhes</th>
              </tr></thead>
              <tbody className="divide-y t-border">
                {filtrados.map(l => {
                  const cfg = ACAO_CONFIG[l.acao] ?? { icone: '📝', label: l.acao, cor: 't-text2' }
                  return (
                    <tr key={l._id} className="hover:bg-orange-500/5 transition-colors">
                      <td className="px-5 py-3 t-text3 text-xs whitespace-nowrap">
                        {new Date(l.createdAt).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 t-text text-sm font-medium">{l.userName}</td>
                      <td className="px-4 py-3">
                        <span className={`text-sm flex items-center gap-1.5 ${cfg.cor}`}>
                          <span>{cfg.icone}</span> {cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 t-text2 text-sm">{l.detalhes}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {pages > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1}
              className="t-card border t-text2 px-4 py-2 rounded-lg text-sm disabled:opacity-40">← Anterior</button>
            <span className="t-text2 text-sm px-4 py-2">{page} / {pages}</span>
            <button onClick={() => setPage(p => Math.min(pages,p+1))} disabled={page===pages}
              className="t-card border t-text2 px-4 py-2 rounded-lg text-sm disabled:opacity-40">Próximo →</button>
          </div>
        )}
      </main>
    </div>
  )
}
