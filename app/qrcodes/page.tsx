'use client'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useCallback, useRef, Suspense } from 'react'
import Navbar from '@/components/Navbar'

interface QRCode {
  _id: string; nomeEvento: string; nomeConta: string; eventoId: string
  imagemBase64: string; pixCopiaCola: string
  status: 'pendente' | 'pago' | 'expirado'
  qrGeradoEm: string; expiresAt: string; createdAt: string; erro?: string
}

function Timer({ expiresAt, onExpired }: { expiresAt: string; onExpired: () => void }) {
  const [restante, setRestante] = useState(() => Math.max(0, new Date(expiresAt).getTime() - Date.now()))
  const expired = useRef(false)

  useEffect(() => {
    const iv = setInterval(() => {
      const r = Math.max(0, new Date(expiresAt).getTime() - Date.now())
      setRestante(r)
      if (r === 0 && !expired.current) { expired.current = true; onExpired() }
    }, 500)
    return () => clearInterval(iv)
  }, [expiresAt, onExpired])

  const mins = Math.floor(restante / 60000)
  const secs = Math.floor((restante % 60000) / 1000)
  const pct = Math.min(100, (restante / (5 * 60000)) * 100)
  const cor = restante < 60000 ? '#ef4444' : restante < 120000 ? '#f59e0b' : '#22c55e'

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs t-text3">Tempo restante</span>
        <span className="text-sm font-mono font-bold" style={{ color: cor }}>
          {mins}:{secs.toString().padStart(2,'0')}
        </span>
      </div>
      <div className="w-full rounded-full h-1.5 t-bg2">
        <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: cor }} />
      </div>
    </div>
  )
}

function QRModal({ q, onClose }: { q: QRCode; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay bg-black/80"
      onClick={onClose}>
      <div className="t-card border rounded-2xl p-5 max-w-sm w-full shadow-2xl animate-fade"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="font-semibold t-text">{q.nomeConta}</div>
            <div className="t-text2 text-sm">{q.nomeEvento}</div>
          </div>
          <button onClick={onClose} className="t-text3 hover:t-text text-2xl leading-none ml-4">×</button>
        </div>
        {q.imagemBase64 ? (
          <div className="bg-white rounded-xl p-3 mb-4">
            <img src={`data:image/png;base64,${q.imagemBase64}`} alt="QR Code Pix"
              className="w-full max-w-[240px] mx-auto block" />
          </div>
        ) : (
          <div className="t-bg rounded-xl h-48 flex items-center justify-center mb-4">
            <span className="t-text3 text-sm">QR indisponível</span>
          </div>
        )}
        <div className="text-center">
          <span className={`text-xs px-3 py-1 rounded-full font-medium ${
            q.status === 'pago' ? 'bg-green-900 text-green-300' :
            q.status === 'expirado' ? 'bg-gray-800 text-gray-400' :
            'bg-orange-900 text-orange-300'
          }`}>
            {q.status === 'pago' ? '✓ Pago' : q.status === 'expirado' ? '⏰ Expirado' : '⏳ Pendente'}
          </span>
        </div>
      </div>
    </div>
  )
}

function QRCard({ q, onPagar, onCopiar, copiedId, onExpired, onOpen }: {
  q: QRCode; onPagar: (id: string) => void; onCopiar: (id: string, t: string) => void
  copiedId: string | null; onExpired: (id: string) => void; onOpen: (q: QRCode) => void
}) {
  const handleExpired = useCallback(() => onExpired(q._id), [q._id, onExpired])

  return (
    <div className={`t-card border rounded-xl overflow-hidden transition-all card-hover ${
      q.status === 'expirado' ? 'opacity-60' :
      q.status === 'pago' ? 'border-green-800' :
      q.erro ? 'border-red-800' : 'border-orange-600/60'
    }`}>
      {/* Header */}
      <div className="px-4 pt-4 pb-2 flex items-start justify-between">
        <div className="min-w-0 flex-1 mr-2">
          <div className="t-text font-medium text-sm truncate">{q.nomeConta}</div>
          <div className="t-text2 text-xs truncate">{q.nomeEvento}</div>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${
          q.status === 'pago' ? 'bg-green-900 text-green-300' :
          q.status === 'expirado' ? 'bg-gray-800 text-gray-400' :
          q.erro ? 'bg-red-900 text-red-300' : 'bg-orange-900 text-orange-300'
        }`}>
          {q.status === 'pago' ? '✓ Pago' : q.status === 'expirado' ? '⏰' : q.erro ? '❌' : '⏳'}
        </span>
      </div>

      {/* Timer */}
      {q.status === 'pendente' && !q.erro && q.expiresAt && (
        <div className="px-4">
          <Timer expiresAt={q.expiresAt} onExpired={handleExpired} />
        </div>
      )}

      {/* QR Code clicável */}
      {q.erro ? (
        <div className="mx-4 mb-3 bg-red-900/20 border border-red-800 rounded-lg p-3">
          <p className="text-red-300 text-xs">{q.erro}</p>
        </div>
      ) : (
        <button onClick={() => onOpen(q)} className="block w-full px-4 pb-3 group">
          {q.imagemBase64 ? (
            <div className="bg-white rounded-lg p-2 relative overflow-hidden">
              <img src={`data:image/png;base64,${q.imagemBase64}`} alt="QR Code"
                className="w-full max-w-[160px] mx-auto block" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center">
                <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-medium bg-black/60 px-2 py-1 rounded transition-opacity">
                  🔍 Ampliar
                </span>
              </div>
            </div>
          ) : (
            <div className="t-bg rounded-lg h-24 flex items-center justify-center">
              <span className="t-text3 text-xs">QR indisponível</span>
            </div>
          )}
        </button>
      )}

      {/* Ações */}
      <div className="px-4 pb-4 space-y-2">
        {q.pixCopiaCola && q.status === 'pendente' && (
          <button onClick={() => onCopiar(q._id, q.pixCopiaCola)}
            className={`w-full text-xs py-2 rounded-lg transition-all font-medium ${
              copiedId === q._id ? 'bg-green-700 text-green-100' : 'btn-ghost !min-h-0 py-2'
            }`}>
            {copiedId === q._id ? '✓ Copiado!' : '📋 Copiar código Pix'}
          </button>
        )}
        {q.status === 'pendente' && !q.erro && (
          <button onClick={() => onPagar(q._id)}
            className="w-full btn-primary py-2 rounded-lg text-sm !min-h-0">
            ✓ Marcar como Pago
          </button>
        )}
      </div>
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
  const [statusFiltro, setStatusFiltro] = useState<'pendente'|'todos'|'pago'|'expirado'>('pendente')
  const [eventoFiltro, setEventoFiltro] = useState<string>(eventoIdParam ?? 'todos')
  const [modalQR, setModalQR] = useState<QRCode | null>(null)

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
    const iv = setInterval(load, 12000)
    return () => clearInterval(iv)
  }, [qrcodes, load])

  async function marcarPago(id: string) {
    await fetch(`/api/qrcodes?id=${id}`, { method: 'PATCH' })
    setQrcodes(prev => prev.map(q => q._id === id ? { ...q, status: 'pago' } : q))
  }

  async function marcarExpirado(id: string) {
    await fetch(`/api/qrcodes?id=${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'expirado' }),
    })
    setQrcodes(prev => prev.map(q => q._id === id ? { ...q, status: 'expirado' } : q))
  }

  async function copiarPix(id: string, texto: string) {
    await navigator.clipboard.writeText(texto)
    setCopiedId(id); setTimeout(() => setCopiedId(null), 2000)
  }

  const eventos = Array.from(new Map(qrcodes.map(q => [q.eventoId, q.nomeEvento])).entries())
  const counts = {
    pendente: qrcodes.filter(q => q.status === 'pendente').length,
    pago: qrcodes.filter(q => q.status === 'pago').length,
    expirado: qrcodes.filter(q => q.status === 'expirado').length,
  }

  const filtrados = qrcodes.filter(q => {
    const okS = statusFiltro === 'todos' || q.status === statusFiltro
    const okE = eventoFiltro === 'todos' || q.eventoId === eventoFiltro
    return okS && okE
  })

  if (status === 'loading') return <div className="min-h-screen t-bg" />

  return (
    <div className="min-h-screen t-bg">
      <Navbar />
      {modalQR && <QRModal q={modalQR} onClose={() => setModalQR(null)} />}

      <main className="max-w-6xl mx-auto px-3 sm:px-6 py-6">
        {/* Header */}
        <div className="mb-5">
          <h1 className="text-xl sm:text-2xl font-bold t-text">QR Codes Pix</h1>
          <p className="t-text2 text-sm mt-0.5">{counts.pendente} pendente · {counts.pago} pago · {counts.expirado} expirado</p>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          {eventos.length > 1 && !eventoIdParam && (
            <select value={eventoFiltro} onChange={e => setEventoFiltro(e.target.value)}
              className="t-input rounded-lg px-3 py-2 text-sm flex-1">
              <option value="todos">Todos os eventos</option>
              {eventos.map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
            </select>
          )}
          <div className="flex gap-1 flex-wrap">
            {(['pendente','todos','pago','expirado'] as const).map(f => (
              <button key={f} onClick={() => setStatusFiltro(f)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-colors whitespace-nowrap ${statusFiltro === f ? 'bg-orange-500 text-white' : 'btn-ghost !min-h-0'}`}>
                {f === 'pendente' ? `⏳ Pendentes ${counts.pendente}` : f === 'pago' ? `✓ Pagos ${counts.pago}` : f === 'expirado' ? `⏰ Expirados ${counts.expirado}` : 'Todos'}
              </button>
            ))}
          </div>
        </div>

        {filtrados.length === 0 ? (
          <div className="text-center py-20 t-text3">
            <div className="text-5xl mb-3">📱</div>
            <p>{qrcodes.length === 0 ? 'Nenhum QR Code ainda.' : 'Nenhum QR Code neste filtro.'}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtrados.map(q => (
              <QRCard key={q._id} q={q} onPagar={marcarPago} onCopiar={copiarPix}
                copiedId={copiedId} onExpired={marcarExpirado} onOpen={setModalQR} />
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
