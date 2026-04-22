'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'

interface Conta { _id: string; nome: string; email: string }
interface ContaSelecionada { contaId: string; tipoIngresso: 'entrada' | 'geral' }
interface Evento {
  _id: string; nome: string; url: string; status: string
  contasSelecionadas: ContaSelecionada[]; createdAt: string
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  aguardando: { label: 'Aguardando', color: 'text-yellow-400' },
  comprando: { label: 'Comprando...', color: 'text-blue-400' },
  finalizado: { label: 'Finalizado', color: 'text-green-400' },
  erro: { label: 'Erro', color: 'text-red-400' },
}

export default function EventosPage() {
  const { status } = useSession()
  const router = useRouter()
  const [contas, setContas] = useState<Conta[]>([])
  const [eventos, setEventos] = useState<Evento[]>([])
  const [showForm, setShowForm] = useState(false)
  const [url, setUrl] = useState('')
  const [nome, setNome] = useState('')
  const [dataLiberacao, setDataLiberacao] = useState('')
  const [selecionadas, setSelecionadas] = useState<ContaSelecionada[]>([])
  const [tipoGlobal, setTipoGlobal] = useState<'entrada' | 'geral'>('geral')
  const [loading, setLoading] = useState(false)
  const [botLoading, setBotLoading] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')

  useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status, router])

  async function load() {
    const [c, e] = await Promise.all([
      fetch('/api/contas').then((r) => r.json()),
      fetch('/api/eventos').then((r) => r.json()),
    ])
    setContas(Array.isArray(c) ? c : [])
    setEventos(Array.isArray(e) ? e : [])
  }

  useEffect(() => { if (status === 'authenticated') load() }, [status])

  // Inicia o polling de status quando há evento "comprando"
  useEffect(() => {
    const comprando = eventos.some((e) => e.status === 'comprando')
    if (!comprando) return
    const interval = setInterval(load, 5000)
    return () => clearInterval(interval)
  }, [eventos])

  function toggleConta(contaId: string) {
    setSelecionadas((prev) => {
      const existe = prev.find((s) => s.contaId === contaId)
      if (existe) return prev.filter((s) => s.contaId !== contaId)
      return [...prev, { contaId, tipoIngresso: tipoGlobal }]
    })
  }

  function setTipoConta(contaId: string, tipo: 'entrada' | 'geral') {
    setSelecionadas((prev) =>
      prev.map((s) => s.contaId === contaId ? { ...s, tipoIngresso: tipo } : s)
    )
  }

  function aplicarTipoGlobal() {
    setSelecionadas((prev) => prev.map((s) => ({ ...s, tipoIngresso: tipoGlobal })))
  }

  async function handleCriarEvento(e: React.FormEvent) {
    e.preventDefault()
    if (selecionadas.length === 0) { setError('Selecione ao menos uma conta'); return }
    setLoading(true)
    setError('')

    const res = await fetch('/api/eventos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, nome, dataLiberacao: dataLiberacao || undefined, contasSelecionadas: selecionadas }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) { setError(data.error ?? 'Erro ao criar evento'); return }
    setUrl(''); setNome(''); setDataLiberacao(''); setSelecionadas([])
    setShowForm(false)
    load()
  }

  async function iniciarBot(eventoId: string) {
    setBotLoading(eventoId)
    setMsg('')
    const res = await fetch('/api/bot/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventoId }),
    })
    const data = await res.json()
    setBotLoading(null)
    if (!res.ok) {
      setMsg(`Erro: ${data.error}`)
    } else {
      setMsg('Bot iniciado com sucesso!')
      load()
    }
  }

  if (status === 'loading') return <div className="min-h-screen bg-gray-950" />

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Eventos</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {showForm ? 'Cancelar' : '+ Novo Evento'}
          </button>
        </div>

        {msg && (
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${msg.startsWith('Erro') ? 'bg-red-900/40 text-red-300 border border-red-800' : 'bg-green-900/40 text-green-300 border border-green-800'}`}>
            {msg}
          </div>
        )}

        {showForm && (
          <form onSubmit={handleCriarEvento} className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6 space-y-5">
            <h2 className="font-semibold text-white">Configurar Novo Evento</h2>

            <div>
              <label className="block text-sm text-gray-400 mb-1">URL do evento</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.ingressonacional.com.br/evento/33724/..."
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Nome do evento (opcional)</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Syon Trio by Douha"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Data/hora de liberação (opcional — para o bot começar a monitorar automaticamente)
              </label>
              <input
                type="datetime-local"
                value={dataLiberacao}
                onChange={(e) => setDataLiberacao(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm text-gray-400">Contas para este evento</label>
                <div className="flex items-center gap-2">
                  <select
                    value={tipoGlobal}
                    onChange={(e) => setTipoGlobal(e.target.value as 'entrada' | 'geral')}
                    className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-xs"
                  >
                    <option value="entrada">Entrada (mais barato)</option>
                    <option value="geral">Ingresso Geral</option>
                  </select>
                  <button
                    type="button"
                    onClick={aplicarTipoGlobal}
                    className="bg-gray-700 hover:bg-gray-600 text-white text-xs px-2 py-1 rounded transition-colors"
                  >
                    Aplicar a todas
                  </button>
                </div>
              </div>

              {contas.length === 0 ? (
                <p className="text-gray-500 text-sm">Nenhuma conta cadastrada. <a href="/contas" className="text-orange-400 hover:underline">Cadastrar contas</a></p>
              ) : (
                <div className="space-y-2">
                  {contas.map((c) => {
                    const sel = selecionadas.find((s) => s.contaId === c._id)
                    return (
                      <div
                        key={c._id}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer ${
                          sel ? 'border-orange-500 bg-orange-500/10' : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                        }`}
                        onClick={() => toggleConta(c._id)}
                      >
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
                          <select
                            value={sel.tipoIngresso}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setTipoConta(c._id, e.target.value as 'entrada' | 'geral')}
                            className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-xs"
                          >
                            <option value="entrada">Entrada</option>
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

            <button
              type="submit"
              disabled={loading}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              {loading ? 'Salvando...' : 'Salvar Evento'}
            </button>
          </form>
        )}

        {eventos.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <div className="text-4xl mb-3">🎟️</div>
            <p>Nenhum evento configurado ainda.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {eventos.map((ev) => {
              const st = STATUS_LABELS[ev.status] ?? { label: ev.status, color: 'text-gray-400' }
              return (
                <div key={ev._id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-semibold text-white">{ev.nome}</div>
                      <div className="text-gray-500 text-xs mt-0.5 break-all">{ev.url}</div>
                      <div className="text-gray-400 text-xs mt-1">
                        {ev.contasSelecionadas.length} conta(s) · Status:{' '}
                        <span className={st.color}>{st.label}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      {ev.status === 'aguardando' && (
                        <button
                          onClick={() => iniciarBot(ev._id)}
                          disabled={botLoading === ev._id}
                          className="bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm px-3 py-1.5 rounded-lg transition-colors"
                        >
                          {botLoading === ev._id ? 'Iniciando...' : '▶ Iniciar Bot'}
                        </button>
                      )}
                      {ev.status === 'comprando' && (
                        <span className="text-blue-400 text-sm animate-pulse">⏳ Comprando...</span>
                      )}
                      {(ev.status === 'finalizado' || ev.status === 'erro') && (
                        <a href="/qrcodes" className="text-orange-400 hover:underline text-sm">
                          Ver QR Codes →
                        </a>
                      )}
                    </div>
                  </div>

                  {ev.contasSelecionadas.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {ev.contasSelecionadas.map((s) => (
                        <span key={s.contaId} className="bg-gray-800 text-gray-300 text-xs px-2 py-1 rounded">
                          {s.tipoIngresso === 'entrada' ? '🟡 Entrada' : '🟠 Geral'}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
