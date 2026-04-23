'use client'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useCallback, useRef, Suspense } from 'react'
import Navbar from '@/components/Navbar'

interface QRCode {
  _id: string; nomeEvento: string; nomeConta: string; eventoId: string
  imagemBase64: string; pixCopiaCola: string
  status: 'pendente' | 'pago' | 'expirado'; createdAt: string; erro?: string
}

const TIMER_MS = 5 * 60 * 1000 // 5 minutos

function useTimer(createdAt: string, status: string) {
  const [restante, setRestante] = useState(0)
  useEffect(() => {
    if (status !== 'pendente') return
    const expira = new Date(createdAt).getTime() + TIMER_MS
    function tick() { setRestante(Math.max(0, expira - Date.now())) }
    tick()
    const iv = setInterval(tick, 1000)
    return () => clearInterval(iv)
  }, [createdAt, status])
  return restante
}

function QRCard({ q, onPagar, onCopiar, copiedId, onExpired }: {
  q: QRCode
  onPagar: (id: string) => void
  onCopiar: (id: string, texto: string) => void
  copiedId: string | null
  onExpired: (id: string) => void
}) {
  const restante = useTimer(q.createdAt, q.status)
  const expirado = useRef(false)

  useEffect(() => {
    if (q.status === 'pendente' && restante === 0 && !expirado.current) {
      expirado.current = true
      onExpired(q._id)
    }
  }, [restante, q.status, q._id, onExpired])

  const mins = Math.floor(restante / 60000)
  const secs = Math.floor((restante % 60000) / 1000)
  const timerColor = restante < 60000 ? 'text-red-400' : restante < 120000 ? 'text-yellow-400' : 'text-green-400'

  return (
    <div className={`t-card border rounded-xl p-4 transition-all ${
      q.status === 'expirado' ? 'opacity-60 border-gray-700' :
      q.status === 'pago' ? 'border-green-800' :
      q.erro ? 'border-red-800' : 'border-orange-600'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1 mr-2">
          <div className="t-text font-medium text-sm truncate">{q.nomeConta}</div>
          <div className="t-text2 text-xs mt-0.5 truncate">{q.nomeEvento}</div>
        </div>
        <div className="text-right shrink-0">
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${
            q.status === 'pago' ? 'bg-green-900 text-green-300' :
            q.status === 'expirado' ? 'bg-gray-800 text-gray-400' :
            q.erro ? 'bg-red-900 text-red-300' : 'bg-orange-900 text-orange-300'
          }`}>
            {q.status === 'pago' ? '✓ Pago' : q.status === 'expirado' ? '⏰ Expirado' : q.erro ? '❌ Erro' : '⏳ Pendente'}
          </span>
          {q.status === 'pendente' && restante > 0 && (
            <div className={`text-xs font-mono mt-1 font-bold ${timerColor}`}>
              {mins}:{secs.toString().padStart(2,'0')}
            </div>
          )}
        </div>
      </div>

      {q.status === 'pendente' && restante > 0 && (
        <div className="w-full bg-gray-700 rounded-full h-1 mb-3">
          <div className={`h-1 rounded-full transition-all ${timerColor.replace('text-','bg-')}`}
            style={{ width: `${(restante / TIMER_MS) * 100}%` }} />
        </div>
      )}

      {q.erro ? (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 mb-3">
          <p className="text-red-300 text-xs">{q.erro}</p>
        </div>
      ) : q.imagemBase64 ? (
        <div className="bg-white rounded-lg p-2 mb-3">
          <img src={`data:image/png;base64,${q.imagemBase64}`} alt="QR Code" className="w-full max-w-[200px] mx-auto block" />
        </div>
      ) : (
        <div className="t-bg rounded-lg h-32 flex items-center justify-center mb-3">
          <span className="t-text3 text-sm">QR indisponível</span>
        </div>
      )}

      {q.pixCopiaCola && q.status === 'pendente' && (
        <button onClick={() => onCopiar(q._id, q.pixCopiaCola)}
          className={`w-full text-xs py-2 px-3 rounded-lg mb-2 transition-colors font-medium ${
            copiedId === q._id ? 'bg-green-700 text-green-100' : 't-bg border t-border t-text2 hover:t-text'
          }`}>
          {copiedId === q._id ? '✓ Copiado!' : '📋 Copiar código Pix'}
        </button>
      )}

      {q.status === 'pendente' && !q.erro && (
        <button onClick={() => onPagar(q._id)}
          className="w-full bg-green-600 hover:bg-green-700 text-white text-sm py-2 rounded-lg font-medium">
          ✓ Marcar como Pago
        </button>
      )}
    </div>
  )
}

function QRCodesContent() {
  const { status } = useSession()
  const router = useRouter()
  const params = useSearchParams()
  const eventoIdParam = params.get('eventoId')

  const [qrcodes, setQrcodes] = useState<QRCode[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [statusFiltro, setStatusFiltro] = useState<'todos' | 'pendente' | 'pago' | 'expirado'>('pendente')
  const [eventoFiltro, setEventoFiltro] = useState<string>(eventoIdParam ?? 'todos')

  useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status, router])

  const load = useCallback(async () => {
    const url = eventoIdParam ? `/api/qrcodes?eventoId=${eventoIdParam}` : '/api/qrcodes'
    const res = await fetch(url)
    if (res.ok) setQrcodes(await res.json())
  }, [eventoIdParam])

  useEffect(() => { if (status === 'authenticated') load() }, [status, load])

  useEffect(() => {
    const temPendente = qrcodes.some(q => q.status === 'pendente')
    if (!temPendente) return
    const iv = setInterval(load, 10000)
    return () => clearInterval(iv)
  }, [qrcodes, load])

  async function marcarPago(id: string) {
    await fetch(`/api/qrcodes?id=${id}`, { method: 'PATCH' })
    setQrcodes(prev => prev.map(q => q._id === id ? { ...q, status: 'pago' } : q))
  }

  async function marcarExpirado(id: string) {
    await fetch(`/api/qrcodes?id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'expirado' }),
    })
    setQrcodes(prev => prev.map(q => q._id === id ? { ...q, status: 'expirado' } : q))
  }

  async function copiarPix(id: string, texto: string) {
    await navigator.clipboard.writeText(texto)
    setCopiedId(id); setTimeout(() => setCopiedId(null), 2000)
  }

  const eventos = Array.from(new Set(qrcodes.map(q => ({ id: q.eventoId, nome: q.nomeEvento })).map(e => JSON.stringify(e)))).map(s => JSON.parse(s))

  const filtrados = qrcodes.filter(q => {
    const okStatus = statusFiltro === 'todos' || q.status === statusFiltro
    const okEvento = eventoFiltro === 'todos' || q.eventoId === eventoFiltro
    return okStatus && okEvento
  })

  const counts = { pendente: qrcodes.filter(q => q.status === 'pendente').length, pago: qrcodes.filter(q => q.status === 'pago').length, expirado: qrcodes.filter(q => q.status === 'expirado').length }

  if (status === 'loading') return <div className="min-h-screen t-bg" />

  return (
    <div className="min-h-screen t-bg">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold t-text">QR Codes Pix</h1>
            <p className="t-text2 text-sm mt-1">{counts.pendente} pendente · {counts.pago} pago · {counts.expirado} expirado</p>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            {eventos.length > 1 && !eventoIdParam && (
              <select value={eventoFiltro} onChange={e => setEventoFiltro(e.target.value)}
                className="t-input border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-orange-500">
                <option value="todos">Todos os eventos</option>
                {eventos.map(ev => <option key={ev.id} value={ev.id}>{ev.nome}</option>)}
              </select>
            )}
            <div className="flex gap-1">
              {(['pendente','todos','pago','expirado'] as const).map(f => (
                <button key={f} onClick={() => setStatusFiltro(f)}
                  className={`px-3 py-1.5 rounded text-xs transition-colors capitalize ${statusFiltro === f ? 'bg-orange-500 text-white' : 't-card border t-text2 hover:t-text'}`}>
                  {f === 'pendente' ? `⏳ Pendentes (${counts.pendente})` : f === 'pago' ? `✓ Pagos (${counts.pago})` : f === 'expirado' ? `⏰ Expirados (${counts.expirado})` : 'Todos'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filtrados.length === 0 ? (
          <div className="text-center py-16 t-text3">
            <div className="text-4xl mb-3">📱</div>
            <p>{qrcodes.length === 0 ? 'Nenhum QR Code ainda.' : 'Nenhum QR Code neste filtro.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtrados.map(q => (
              <QRCard key={q._id} q={q} onPagar={marcarPago} onCopiar={copiarPix}
                copiedId={copiedId} onExpired={marcarExpirado} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default function QRCodesPage() {
  return <Suspense fallback={<div className="min-h-screen t-bg" />}><QRCodesContent /></Suspense>
}
