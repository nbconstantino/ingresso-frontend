'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

interface Conta { _id: string; nome: string; email: string }
interface ContaSel { contaId: string; tipoIngresso: 'entrada' | 'geral' }
interface Evento {
  _id: string; nome: string; url: string; status: string
  contasSelecionadas: ContaSel[]; createdAt: string
}

const STATUS: Record<string, { label: string; color: string; dot: string }> = {
  aguardando: { label: 'Aguardando',   color: 'text-yellow-400', dot: 'bg-yellow-400' },
  comprando:  { label: 'Comprando...', color: 'text-blue-400',   dot: 'bg-blue-400 animate-pulse' },
  finalizado: { label: 'Finalizado',   color: 'text-green-400',  dot: 'bg-green-400' },
  erro:       { label: 'Erro',         color: 'text-red-400',    dot: 'bg-red-400' },
}

const FILTROS = ['todos', 'aguardando', 'comprando', 'finalizado', 'erro'] as const
type Filtro = typeof FILTROS[number]

export default function EventosPage() {
  const { status } = useSession()
  const router = useRouter()
  const [contas, setContas] = useState<Conta[]>([])
  const [eventos, setEventos] = useState<Evento[]>([])
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [showForm, setShowForm] = useState(false)
  const [url, setUrl] = useState('')
  const [nome, setNome] = useState('')
  const [nomeLoading, setNomeLoading] = useState(false)
  const [dataLiberacao, setDataLiberacao] = useState('')
  const [selecionadas, setSelecionadas] = useState<ContaSel[]>([])
  const [tipoGlobal, setTipoGlobal] = useState<'entrada' | 'geral'>('geral')
  const [loading, setLoading] = useState(false)
  const [botLoading, setBotLoading] = useState<string | null>(null)
  const [parando, setParando] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status, router])

  const load = useCallback(async () => {
    const [c, e] = await Promise.all([
      fetch('/api/contas').then(r => r.json()),
      fetch('/api/eventos').then(r => r.json()),
    ])
    setContas(Array.isArray(c) ? c : [])
    setEventos(Array.isArray(e) ? e : [])
  }, [])

  useEffect(() => { if (status === 'authenticated') load() }, [status, load])

  useEffect(() => {
    const comprando = eventos.some(e => e.status === 'comprando')
    if (!comprando) return
    const iv = setInterval(load, 5000)
    return () => clearInterval(iv)
  }, [eventos, load])

  useEffect(() => {
    if (!url.includes('/evento/')) { setNome(''); return }
    setNomeLoading(true)
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/evento-info?url=${encodeURIComponent(url)}`)
        const data = await res.json()
        if (data.nome) setNome(data.nome)
      } catch {}
      setNomeLoading(false)
    }, 600)
    return () => clearTimeout(t)
  }, [url])

  function toggleConta(id: string) {
    setSelecionadas(prev => {
      const existe = prev.find(s => s.contaId === id)
      if (existe) return prev.filter(s => s.contaId !== id)
      return [...prev, { contaId: id, tipoIngresso: tipoGlobal }]
    })
  }

  function setTipoConta(id: string, tipo: 'entrada' | 'geral') {
    setSelecionadas(prev => prev.map(s => s.contaId === id ? { ...s, tipoIngresso: tipo } : s))
  }

  async function handleCriar(e: React.FormEvent) {
    e.preventDefault()
    if (selecionadas.length === 0) { setError('Selecione ao menos uma conta'); return }
    setLoading(true); setError('')
    const res = await fetch('/api/eventos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, nome, dataLiberacao: dataLiberacao || undefined, contasSelecionadas: selecionadas }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'Erro'); return }
    setUrl(''); setNome(''); setDataLiberacao(''); setSelecionadas([])
    setShowForm(false); load()
  }

  async function iniciarBot(eventoId: string) {
    setBotLoading(eventoId); setMsg('')
    const res = await fetch('/api/bot/start', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventoId }),
    })
    const data = await res.json()
    setBotLoading(null)
    if (!res.ok) { setMsg(`Erro: ${data.error}`); setTimeout(() => setMsg(''), 4000) }
    else { setMsg('Bot iniciado!'); setTimeout(() => setMsg(''), 3000); load() }
  }

  async function pararBot(eventoId: string) {
    if (!confirm('Parar o bot para este evento?')) return
    setParando(eventoId)
    await fetch('/api/bot/stop', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventoId }),
    })
    setParando(null)
    setMsg('Bot parado.')
    setTimeout(() => setMsg(''), 3000)
    load()
  }

  async function deletarEvento(eventoId: string) {
    if (!confirm('Remover este evento?')) return
    await fetch(`/api/eventos?id=${eventoId}`, { method: 'DELETE' })
    load()
  }

  const eventosFiltrados = filtro === 'todos' ? eventos : eventos.filter(e => e.status === filtro)
  const contadores = eventos.reduce((acc, e) => {
    acc[e.status] = (acc[e.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  if (status === 'loading') return <div className="min-h-screen t-bg" />

  return (
    <div className="min-h-screen t-bg">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-white">Eventos</h1>
          <button onClick={() => { setShowForm(!showForm); setError('') }}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            {showForm ? 'Cancelar' : '+ Novo Evento'}
          </button>
        </div>

        {/* Filtros por status */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {FILTROS.map(f => {
            const count = f === 'todos' ? eventos.length : (contadores[f] || 0)
            const st = STATUS[f as keyof typeof STATUS]
            return (
              <button key={f} onClick={() => setFiltro(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  filtro === f
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                }`}>
                {f !== 'todos' && <span className={`w-1.5 h-1.5 rounded-full ${st?.dot?.replace(' animate-pulse','') ?? 'bg-gray-400'}`} />}
                <span className="capitalize">{f === 'todos' ? 'Todos' : STATUS[f]?.label ?? f}</span>
                <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-xs ${filtro === f ? 'bg-white/20' : 'bg-gray-700'}`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {msg && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm border ${msg.startsWith('Erro') ? 'bg-red-900/30 text-red-300 border-red-800' : 'bg-green-900/30 text-green-300 border-green-800'}`}>
            {msg}
          </div>
        )}

        {/* Formulário novo evento */}
        {showForm && (
          <form onSubmit={handleCriar} className="t-card border rounded-xl p-6 mb-6 space-y-5">
            <h2 className="font-semibold text-white">Configurar Evento</h2>
            <div>
              <label className="block text-sm text-gray-400 mb-1">URL do evento</label>
              <input type="url" value={url} onChange={e => setUrl(e.target.value)} required
                placeholder="https://www.ingressonacional.com.br/evento/33724/..."
                className="w-full t-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500 placeholder-gray-600" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Nome do evento {nomeLoading && <span className="t-text3 text-xs ml-1">detectando...</span>}
              </label>
              <input type="text" value={nome} onChange={e => setNome(e.target.value)}
                placeholder="Detectado automaticamente"
                className="w-full t-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500 placeholder-gray-600" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Data/hora de liberação (opcional)</label>
              <input type="datetime-local" value={dataLiberacao} onChange={e => setDataLiberacao(e.target.value)}
                className="w-full t-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm text-gray-400">Contas</label>
                <div className="flex items-center gap-2">
                  <select value={tipoGlobal} onChange={e => setTipoGlobal(e.target.value as 'entrada' | 'geral')}
                    className="t-input rounded px-2 py-1 text-xs">
                    <option value="entrada">Com horário limite</option>
                    <option value="geral">Ingresso Geral</option>
                  </select>
                  <button type="button" onClick={() => setSelecionadas(prev => prev.map(s => ({ ...s, tipoIngresso: tipoGlobal })))}
                    className="bg-gray-700 hover:bg-gray-600 text-white text-xs px-2 py-1 rounded">
                    Aplicar a todas
                  </button>
                </div>
              </div>
              {contas.length === 0 ? (
                <p className="t-text3 text-sm">Nenhuma conta. <a href="/contas" className="text-orange-400 hover:underline">Cadastrar</a></p>
              ) : (
                <div className="space-y-2">
                  {contas.map(c => {
                    const sel = selecionadas.find(s => s.contaId === c._id)
                    return (
                      <div key={c._id} onClick={() => toggleConta(c._id)}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${sel ? 'border-orange-500 bg-orange-500/10' : 'border-gray-700 bg-gray-800 hover:border-gray-600'}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${sel ? 'border-orange-500 bg-orange-500' : 'border-gray-600'}`}>
                            {sel && <span className="text-white text-xs">✓</span>}
                          </div>
                          <div>
                            <div className="text-white text-sm font-medium">{c.nome}</div>
                            <div className="text-gray-400 text-xs">{c.email}</div>
                          </div>
                        </div>
                        {sel && (
                          <select value={sel.tipoIngresso} onClick={e => e.stopPropagation()}
                            onChange={e => setTipoConta(c._id, e.target.value as 'entrada' | 'geral')}
                            className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs">
                            <option value="entrada">Com horário limite</option>
                            <option value="geral">Geral</option>
                          </select>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
              {selecionadas.length > 0 && (
                <p className="text-orange-400 text-xs mt-2">{selecionadas.length} conta(s) selecionada(s)</p>
              )}
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" disabled={loading}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium transition-colors">
              {loading ? 'Salvando...' : 'Salvar Evento'}
            </button>
          </form>
        )}

        {/* Lista de eventos */}
        {eventosFiltrados.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <div className="text-4xl mb-3">🎟️</div>
            <p>{filtro === 'todos' ? 'Nenhum evento configurado.' : `Nenhum evento com status "${STATUS[filtro]?.label ?? filtro}".`}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {eventosFiltrados.map(ev => {
              const st = STATUS[ev.status] ?? { label: ev.status, color: 'text-gray-400', dot: 'bg-gray-400' }
              return (
                <div key={ev._id} className="t-card border rounded-xl p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${st.dot}`} />
                        <span className={`text-xs font-medium ${st.color}`}>{st.label}</span>
                      </div>
                      <div className="font-semibold text-white">{ev.nome}</div>
                      <div className="t-text3 text-xs mt-0.5 truncate">{ev.url}</div>
                      <div className="text-gray-400 text-xs mt-1">{ev.contasSelecionadas.length} conta(s)</div>
                    </div>

                    {/* Botões de ação */}
                    <div className="flex flex-col gap-1.5 shrink-0">
                      {ev.status === 'aguardando' && (
                        <button onClick={() => iniciarBot(ev._id)} disabled={botLoading === ev._id}
                          className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded-lg transition-colors">
                          {botLoading === ev._id ? '...' : '▶ Iniciar'}
                        </button>
                      )}
                      {ev.status === 'comprando' && (
                        <button onClick={() => pararBot(ev._id)} disabled={parando === ev._id}
                          className="bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded-lg transition-colors">
                          {parando === ev._id ? '...' : '⏹ Parar'}
                        </button>
                      )}
                      {(ev.status === 'comprando' || ev.status === 'erro') && (
                        <Link href={`/logs?eventoId=${ev._id}`}
                          className="bg-gray-700 hover:bg-gray-600 text-white text-xs px-3 py-1.5 rounded-lg transition-colors text-center">
                          📋 Logs
                        </Link>
                      )}
                      {ev.status === 'finalizado' && (
                        <>
                          <Link href={`/logs?eventoId=${ev._id}`}
                            className="bg-gray-700 hover:bg-gray-600 text-white text-xs px-3 py-1.5 rounded-lg transition-colors text-center">
                            📋 Logs
                          </Link>
                          <Link href="/qrcodes"
                            className="bg-orange-600 hover:bg-orange-500 text-white text-xs px-3 py-1.5 rounded-lg transition-colors text-center">
                            📱 QR Codes
                          </Link>
                        </>
                      )}
                      {(ev.status === 'aguardando' || ev.status === 'erro' || ev.status === 'finalizado') && (
                        <button onClick={() => deletarEvento(ev._id)}
                          className="text-gray-600 hover:text-red-400 text-xs px-3 py-1.5 rounded-lg transition-colors text-center">
                          🗑 Remover
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
