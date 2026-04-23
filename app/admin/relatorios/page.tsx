'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import Navbar from '@/components/Navbar'

interface EventoUsuario { eventoId: string; nomeEvento: string; total: number; pagos: number; pendentes: number; ultimoGerado: string }
interface UsuarioRel { _id: string; nome: string; email: string; totalGeral: number; pagosGeral: number; eventos: EventoUsuario[] }
interface EventoRel { _id: string; nomeEvento: string; total: number; pagos: number; numUsuarios: number }

export default function RelatoriosPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [mes, setMes] = useState(() => new Date().toISOString().slice(0,7))
  const [tab, setTab] = useState<'usuarios'|'eventos'>('usuarios')
  const [usuarios, setUsuarios] = useState<UsuarioRel[]>([])
  const [eventos, setEventos] = useState<EventoRel[]>([])
  const [expandido, setExpandido] = useState<string|null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return }
    if (status === 'authenticated' && (session?.user as { role?: string })?.role !== 'admin') router.push('/dashboard')
  }, [status, session, router])

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/relatorios?mes=${mes}`)
    if (res.ok) {
      const data = await res.json()
      setUsuarios(data.porUsuario ?? [])
      setEventos(data.porEvento ?? [])
    }
    setLoading(false)
  }, [mes])

  useEffect(() => { if (status === 'authenticated') load() }, [status, load])

  const totalQR = usuarios.reduce((s,u) => s + u.totalGeral, 0)
  const totalPagos = usuarios.reduce((s,u) => s + u.pagosGeral, 0)

  if (status === 'loading') return <div className="min-h-screen t-bg" />

  return (
    <div className="min-h-screen t-bg">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold t-text mb-6">Relatórios</h1>

        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'QR Codes gerados', value: totalQR, color: 'text-orange-400' },
            { label: 'QR Codes pagos', value: totalPagos, color: 'text-green-400' },
            { label: 'Taxa de pagamento', value: totalQR ? `${Math.round(totalPagos/totalQR*100)}%` : '—', color: 'text-blue-400' },
          ].map(s => (
            <div key={s.label} className="t-card border rounded-xl p-4 text-center">
              <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
              <div className="t-text2 text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="t-text2 text-sm">Mês:</label>
            <input type="month" value={mes} onChange={e => setMes(e.target.value)}
              className="t-input border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-orange-500" />
          </div>
          <div className="flex gap-2 ml-auto">
            {(['usuarios','eventos'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab===t ? 'bg-orange-500 text-white' : 't-card border t-text2 hover:t-text'}`}>
                {t === 'usuarios' ? '👤 Por Usuário' : '🎟️ Por Evento'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 t-text3">Carregando...</div>
        ) : tab === 'usuarios' ? (
          <div className="space-y-3">
            {usuarios.length === 0 ? <p className="text-center py-12 t-text3">Nenhum dado.</p> :
              usuarios.map(u => (
                <div key={u._id} className="t-card border rounded-xl overflow-hidden">
                  <button onClick={() => setExpandido(expandido === u._id ? null : u._id)}
                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-orange-500/5 transition-colors">
                    <div className="text-left">
                      <div className="t-text font-medium">{u.nome}</div>
                      <div className="t-text2 text-sm">{u.email}</div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right"><div className="text-orange-400 font-bold text-lg">{u.totalGeral}</div><div className="t-text3 text-xs">QR Codes</div></div>
                      <div className="text-right"><div className="text-green-400 font-bold text-lg">{u.pagosGeral}</div><div className="t-text3 text-xs">Pagos</div></div>
                      <div className="text-right"><div className="text-blue-400 font-bold text-lg">{u.totalGeral ? `${Math.round(u.pagosGeral/u.totalGeral*100)}%` : '—'}</div><div className="t-text3 text-xs">Taxa</div></div>
                      <span className="t-text3">{expandido === u._id ? '▲' : '▼'}</span>
                    </div>
                  </button>
                  {expandido === u._id && (
                    <div className="border-t t-border">
                      <table className="w-full text-sm">
                        <thead><tr className="t-bg2 t-text3 text-xs">
                          <th className="text-left px-5 py-2">Evento</th>
                          <th className="text-center px-3 py-2">Total</th>
                          <th className="text-center px-3 py-2">Pagos</th>
                          <th className="text-center px-3 py-2">Taxa</th>
                          <th className="text-right px-5 py-2">Último</th>
                        </tr></thead>
                        <tbody className="divide-y t-border">
                          {u.eventos.sort((a,b) => b.total - a.total).map((ev,i) => (
                            <tr key={i} className="hover:bg-orange-500/5">
                              <td className="px-5 py-3 t-text">{ev.nomeEvento}</td>
                              <td className="text-center px-3 py-3 text-orange-400 font-medium">{ev.total}</td>
                              <td className="text-center px-3 py-3 text-green-400">{ev.pagos}</td>
                              <td className="text-center px-3 py-3 text-blue-400">{ev.total ? `${Math.round(ev.pagos/ev.total*100)}%` : '—'}</td>
                              <td className="text-right px-5 py-3 t-text3 text-xs">{new Date(ev.ultimoGerado).toLocaleDateString('pt-BR')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))
            }
          </div>
        ) : (
          <div className="space-y-2">
            {eventos.length === 0 ? <p className="text-center py-12 t-text3">Nenhum dado.</p> :
              eventos.map(ev => (
                <div key={ev._id} className="t-card border rounded-xl px-5 py-4 flex items-center justify-between">
                  <div className="flex-1 min-w-0 mr-4">
                    <div className="t-text font-medium truncate">{ev.nomeEvento}</div>
                    <div className="t-text3 text-xs mt-0.5">{ev.numUsuarios} usuário(s)</div>
                  </div>
                  <div className="flex items-center gap-6 shrink-0">
                    <div className="text-center"><div className="text-orange-400 font-bold">{ev.total}</div><div className="t-text3 text-xs">Total</div></div>
                    <div className="text-center"><div className="text-green-400 font-bold">{ev.pagos}</div><div className="t-text3 text-xs">Pagos</div></div>
                    <div className="text-center"><div className="text-blue-400 font-bold">{ev.total ? `${Math.round(ev.pagos/ev.total*100)}%` : '—'}</div><div className="t-text3 text-xs">Taxa</div></div>
                  </div>
                </div>
              ))
            }
          </div>
        )}
      </main>
    </div>
  )
}
