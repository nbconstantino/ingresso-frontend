'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback, useRef } from 'react'
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
  const { data: session, status } = useSession()
  const router = useRouter()
  const user = session?.user as { role?: string; name?: string } | undefined
  const isAdmin = user?.role === 'admin'

  const [contas, setContas] = useState<Conta[]>([])
  const [eventos, setEventos] = useState<Evento[]>([])
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [showForm, setShowForm] = useState(false)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [url, setUrl] = useState('')
  const [nome, setNome] = useState('')
  const [nomeLoading, setNomeLoading] = useState(false)
  const [dataLiberacao, setDataLiberacao] = useState('')
  const [selecionadas, setSelecionadas] = useState<ContaSel[]>([])
  const [tipoGlobal, setTipoGlobal] = useState<'entrada' | 'geral'>('geral')
  const [loading, setLoading] = useState(false)
  const [botLoading, setBotLoading] = useState<string | null>(null)
  const [menuAberto, setMenuAberto] = useState<string | null>(null)
  const [modalExclusao, setModalExclusao] = useState<{ id: string; nome: string } | null>(null)
  const [motivoExclusao, setMotivoExclusao] = useState('')
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

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

  // Fecha menu ao clicar fora
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuAberto(null)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  // Auto-detecta nome
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

  function abrirEditar(ev: Evento) {
    setEditandoId(ev._id)
    setUrl(ev.url)
    setNome(ev.nome)
    setSelecionadas(ev.contasSelecionadas)
    setShowForm(true)
    setError('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function toggleConta(id: string) {
    setSelecionadas(prev => {
      const existe = prev.find(s => s.contaId === id)
      if (existe) return prev.filter(s => s.contaId !== id)
      return [...prev, { contaId: id, tipoIngresso: tipoGlobal }]
    })
  }

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    if (selecionadas.length === 0) { setError('Selecione ao menos uma conta'); return }
    setLoading(true); setError('')

    if (editandoId) {
      // Editar evento existente
      const res = await fetch(`/api/eventos?id=${editandoId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, nome, contasSelecionadas: selecionadas, dataLiberacao: dataLiberacao || undefined }),
      })
      const data = await res.json()
      setLoading(false)
      if (!res.ok) { setError(data.error ?? 'Erro'); return }
      setMsg('Evento atualizado!')
    } else {
      // Criar novo
      const res = await fetch('/api/eventos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, nome, dataLiberacao: dataLiberacao || undefined, contasSelecionadas: selecionadas }),
      })
      const data = await res.json()
      setLoading(false)
      if (!res.ok) { setError(data.error ?? 'Erro'); return }
      setMsg('Evento criado!')
    }

    setUrl(''); setNome(''); setDataLiberacao(''); setSelecionadas([])
    setShowForm(false); setEditandoId(null)
    setTimeout(() => setMsg(''), 3000)
    load()
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
    await fetch('/api/bot/stop', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventoId }),
    })
    load()
  }

  async function solicitarExclusao() {
    if (!modalExclusao) return
    const res = await fetch('/api/eventos/exclusao', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventoId: modalExclusao.id, motivo: motivoExclusao }),
    })
    const data = await res.json()
    setModalExclusao(null); setMotivoExclusao('')
    if (data.deletado) { setMsg('Evento removido.'); load() }
    else if (data.solicitado) setMsg('Solicitação de exclusão enviada ao admin.')
    else if (data.jasolicitado) setMsg('Já existe uma solicitação pendente.')
    setTimeout(() => setMsg(''), 4000)
  }

  const eventosFiltrados = filtro === 'todos' ? eventos : eventos.filter(e => e.status === filtro)
  const contadores = eventos.reduce((acc, e) => { acc[e.status] = (acc[e.status] || 0) + 1; return acc }, {} as Record<string, number>)

  if (status === 'loading') return <div className="min-h-screen t-bg" />

  return (
    <div className="min-h-screen t-bg">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold t-text">Eventos</h1>
          <button onClick={() => { setShowForm(!showForm); setEditandoId(null); setError(''); setUrl(''); setNome(''); setSelecionadas([]) }}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            {showForm && !editandoId ? 'Cancelar' : '+ Novo Evento'}
          </button>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {FILTROS.map(f => {
            const count = f === 'todos' ? eventos.length : (contadores[f] || 0)
            return (
              <button key={f} onClick={() => setFiltro(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${filtro === f ? 'bg-orange-500 text-white' : 't-card border t-text2 hover:t-text'}`}>
                {f !== 'todos' && <span className={`w-1.5 h-1.5 rounded-full ${STATUS[f]?.dot?.replace(' animate-pulse','') ?? 'bg-gray-400'}`} />}
                {f === 'todos' ? 'Todos' : STATUS[f]?.label ?? f}
                <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-xs ${filtro === f ? 'bg-white/20' : 'bg-gray-700 text-gray-300'}`}>{count}</span>
              </button>
            )
          })}
        </div>

        {msg && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm border ${msg.startsWith('Erro') ? 'bg-red-900/30 text-red-300 border-red-800' : 'bg-green-900/30 text-green-300 border-green-800'}`}>
            {msg}
          </div>
        )}

        {/* Formulário */}
        {showForm && (
          <form onSubmit={handleSalvar} className="t-card border rounded-xl p-6 mb-6 space-y-5">
            <h2 className="font-semibold t-text">{editandoId ? '✏️ Editar Evento' : 'Novo Evento'}</h2>

            <div>
              <label className="block text-sm t-text2 mb-1">URL do evento</label>
              <input type="url" value={url} onChange={e => setUrl(e.target.value)} required
                placeholder="https://www.ingressonacional.com.br/evento/33724/..."
                className="w-full t-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500 placeholder-gray-600" />
            </div>

            <div>
              <label className="block text-sm t-text2 mb-1">
                Nome {nomeLoading && <span className="t-text3 text-xs ml-1">detectando...</span>}
              </label>
              <input type="text" value={nome} onChange={e => setNome(e.target.value)}
                placeholder="Detectado automaticamente"
                className="w-full t-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500 placeholder-gray-600" />
            </div>

            <div>
              <label className="block text-sm t-text2 mb-1">Data/hora de liberação (opcional)</label>
              <input type="datetime-local" value={dataLiberacao} onChange={e => setDataLiberacao(e.target.value)}
                className="w-full t-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm t-text2">Contas</label>
                <div className="flex items-center gap-2">
                  <select value={tipoGlobal} onChange={e => setTipoGlobal(e.target.value as 'entrada' | 'geral')}
                    className="t-input rounded px-2 py-1 text-xs">
                    <option value="entrada">Com horário limite</option>
                    <option value="geral">Ingresso Geral</option>
                  </select>
                  <button type="button" onClick={() => setSelecionadas(prev => prev.map(s => ({ ...s, tipoIngresso: tipoGlobal })))}
                    className="t-card border t-text2 text-xs px-2 py-1 rounded">Aplicar a todas</button>
                </div>
              </div>
              <div className="space-y-2">
                {contas.map(c => {
                  const sel = selecionadas.find(s => s.contaId === c._id)
                  return (
                    <div key={c._id} onClick={() => toggleConta(c._id)}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${sel ? 'border-orange-500 bg-orange-500/10' : 't-card border hover:border-orange-400'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${sel ? 'border-orange-500 bg-orange-500' : 'border-gray-600'}`}>
                          {sel && <span className="text-white text-xs">✓</span>}
                        </div>
                        <div>
                          <div className="t-text text-sm font-medium">{c.nome}</div>
                          <div className="t-text2 text-xs">{c.email}</div>
                        </div>
                      </div>
                      {sel && (
                        <select value={sel.tipoIngresso} onClick={e => e.stopPropagation()}
                          onChange={e => setSelecionadas(prev => prev.map(s => s.contaId === c._id ? { ...s, tipoIngresso: e.target.value as 'entrada' | 'geral' } : s))}
                          className="t-input rounded px-2 py-1 text-xs">
                          <option value="entrada">Com horário limite</option>
                          <option value="geral">Geral</option>
                        </select>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex gap-3">
              <button type="submit" disabled={loading}
                className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium transition-colors">
                {loading ? 'Salvando...' : editandoId ? 'Salvar Edição' : 'Salvar Evento'}
              </button>
              {editandoId && (
                <button type="button" onClick={() => { setShowForm(false); setEditandoId(null) }}
                  className="t-card border t-text2 px-4 py-2 rounded-lg text-sm transition-colors">Cancelar</button>
              )}
            </div>
          </form>
        )}

        {/* Lista */}
        {eventosFiltrados.length === 0 ? (
          <div className="text-center py-16 t-text3">
            <div className="text-4xl mb-3">🎟️</div>
            <p>{filtro === 'todos' ? 'Nenhum evento.' : `Nenhum evento "${STATUS[filtro]?.label ?? filtro}".`}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {eventosFiltrados.map(ev => {
              const st = STATUS[ev.status] ?? { label: ev.status, color: 't-text2', dot: 'bg-gray-400' }
              return (
                <div key={ev._id} className="t-card border rounded-xl p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${st.dot}`} />
                        <span className={`text-xs font-medium ${st.color}`}>{st.label}</span>
                      </div>
                      <div className="font-semibold t-text">{ev.nome}</div>
                      <div className="t-text3 text-xs mt-0.5 truncate">{ev.url}</div>
                      <div className="t-text2 text-xs mt-1">{ev.contasSelecionadas.length} conta(s)</div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Botões de ação */}
                      {ev.status === 'aguardando' && (
                        <button onClick={() => iniciarBot(ev._id)} disabled={botLoading === ev._id}
                          className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded-lg">
                          {botLoading === ev._id ? '...' : '▶ Iniciar'}
                        </button>
                      )}
                      {ev.status === 'comprando' && (
                        <button onClick={() => pararBot(ev._id)}
                          className="bg-red-700 hover:bg-red-600 text-white text-xs px-3 py-1.5 rounded-lg">⏹ Parar</button>
                      )}
                      {(ev.status === 'comprando' || ev.status === 'erro') && (
                        isAdmin
                          ? <Link href={`/logs?eventoId=${ev._id}`} className="t-card border t-text2 text-xs px-3 py-1.5 rounded-lg">📋 Logs</Link>
                          : <Link href={`/status?eventoId=${ev._id}`} className="t-card border t-text2 text-xs px-3 py-1.5 rounded-lg">📊 Status</Link>
                      )}
                      {ev.status === 'finalizado' && (
                        <Link href={`/qrcodes?eventoId=${ev._id}`}
                          className="bg-orange-600 hover:bg-orange-500 text-white text-xs px-3 py-1.5 rounded-lg">📱 QR Codes</Link>
                      )}

                      {/* Menu 3 pontinhos */}
                      <div className="relative" ref={menuAberto === ev._id ? menuRef : null}>
                        <button onClick={() => setMenuAberto(menuAberto === ev._id ? null : ev._id)}
                          className="t-card border t-text2 w-8 h-8 rounded-lg flex items-center justify-center text-lg hover:t-text transition-colors">
                          ⋯
                        </button>
                        {menuAberto === ev._id && (
                          <div className="absolute right-0 top-9 t-card border rounded-xl shadow-xl z-20 py-1 w-44">
                            {ev.status === 'aguardando' && (
                              <button onClick={() => { setMenuAberto(null); abrirEditar(ev) }}
                                className="w-full text-left px-4 py-2 text-sm t-text hover:bg-orange-500/10 hover:text-orange-400 transition-colors">
                                ✏️ Editar
                              </button>
                            )}
                            {isAdmin && (
                              <button onClick={() => { setMenuAberto(null); fetch(`/api/eventos?id=${ev._id}`, { method: 'DELETE' }).then(() => load()) }}
                                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                                🗑️ Remover
                              </button>
                            )}
                            {!isAdmin && (
                              <button onClick={() => { setMenuAberto(null); setModalExclusao({ id: ev._id, nome: ev.nome }) }}
                                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                                🗑️ Solicitar exclusão
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Modal de exclusão */}
        {modalExclusao && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="t-card border rounded-xl p-6 w-full max-w-md">
              <h3 className="font-semibold t-text mb-2">Solicitar exclusão</h3>
              <p className="t-text2 text-sm mb-4">O admin precisará aprovar a exclusão de <strong>{modalExclusao.nome}</strong>.</p>
              <textarea value={motivoExclusao} onChange={e => setMotivoExclusao(e.target.value)}
                placeholder="Motivo (opcional)"
                className="w-full t-input rounded-lg px-3 py-2 text-sm resize-none h-20 mb-4 focus:outline-none focus:border-orange-500" />
              <div className="flex gap-3">
                <button onClick={solicitarExclusao}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm flex-1">Solicitar</button>
                <button onClick={() => { setModalExclusao(null); setMotivoExclusao('') }}
                  className="t-card border t-text2 px-4 py-2 rounded-lg text-sm">Cancelar</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
