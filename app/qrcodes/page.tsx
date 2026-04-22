'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import Navbar from '@/components/Navbar'

interface QRCode {
  _id: string; nomeEvento: string; nomeConta: string
  imagemBase64: string; pixCopiaCola: string
  status: 'pendente' | 'pago'; createdAt: string; erro?: string
}

export default function QRCodesPage() {
  const { status } = useSession()
  const router = useRouter()
  const [qrcodes, setQrcodes] = useState<QRCode[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [statusFiltro, setStatusFiltro] = useState<'todos' | 'pendente' | 'pago'>('todos')
  const [eventoFiltro, setEventoFiltro] = useState<string>('todos')

  useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status, router])

  const load = useCallback(async () => {
    const res = await fetch('/api/qrcodes')
    if (res.ok) setQrcodes(await res.json())
  }, [])

  useEffect(() => { if (status === 'authenticated') load() }, [status, load])

  useEffect(() => {
    const temPendente = qrcodes.some(q => q.status === 'pendente')
    if (!temPendente) return
    const iv = setInterval(load, 8000)
    return () => clearInterval(iv)
  }, [qrcodes, load])

  async function marcarPago(id: string) {
    await fetch(`/api/qrcodes?id=${id}`, { method: 'PATCH' })
    setQrcodes(prev => prev.map(q => q._id === id ? { ...q, status: 'pago' } : q))
  }

  async function copiarPix(id: string, texto: string) {
    await navigator.clipboard.writeText(texto)
    setCopiedId(id); setTimeout(() => setCopiedId(null), 2000)
  }

  // Eventos únicos para o filtro
  const eventos = Array.from(new Set(qrcodes.map(q => q.nomeEvento))).sort()

  const filtrados = qrcodes.filter(q => {
    const okStatus = statusFiltro === 'todos' || q.status === statusFiltro
    const okEvento = eventoFiltro === 'todos' || q.nomeEvento === eventoFiltro
    return okStatus && okEvento
  })

  const pendentes = qrcodes.filter(q => q.status === 'pendente').length
  const pagos = qrcodes.filter(q => q.status === 'pago').length

  if (status === 'loading') return <div className="min-h-screen bg-gray-950" />

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">QR Codes Pix</h1>
            <p className="text-gray-400 text-sm mt-1">
              {pendentes} pendente(s) · {pagos} pago(s) · {qrcodes.length} total
            </p>
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap gap-3 items-center">
            {/* Filtro por evento */}
            {eventos.length > 1 && (
              <select value={eventoFiltro} onChange={e => setEventoFiltro(e.target.value)}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-orange-500">
                <option value="todos">Todos os eventos</option>
                {eventos.map(ev => (
                  <option key={ev} value={ev}>{ev}</option>
                ))}
              </select>
            )}

            {/* Filtro por status */}
            <div className="flex gap-1">
              {(['todos', 'pendente', 'pago'] as const).map(f => (
                <button key={f} onClick={() => setStatusFiltro(f)}
                  className={`px-3 py-1.5 rounded text-sm transition-colors capitalize ${
                    statusFiltro === f ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                  }`}>
                  {f === 'todos' ? 'Todos' : f === 'pendente' ? '⏳ Pendentes' : '✓ Pagos'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filtrados.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <div className="text-4xl mb-3">📱</div>
            <p>{qrcodes.length === 0 ? 'Nenhum QR Code ainda.' : 'Nenhum QR Code para este filtro.'}</p>
            {qrcodes.length === 0 && <p className="text-sm mt-1">Configure um evento e inicie o bot.</p>}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtrados.map(q => (
              <div key={q._id}
                className={`bg-gray-900 border rounded-xl p-4 transition-colors ${
                  q.erro ? 'border-red-800' : q.status === 'pago' ? 'border-green-800 opacity-80' : 'border-gray-800'
                }`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1 mr-2">
                    <div className="text-white font-medium text-sm truncate">{q.nomeConta}</div>
                    <div className="text-gray-400 text-xs mt-0.5 truncate">{q.nomeEvento}</div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${
                    q.erro ? 'bg-red-900 text-red-300' :
                    q.status === 'pago' ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'
                  }`}>
                    {q.erro ? '❌ Erro' : q.status === 'pago' ? '✓ Pago' : '⏳ Pendente'}
                  </span>
                </div>

                {q.erro ? (
                  <div className="bg-red-900/20 border border-red-800 rounded-lg p-3 mb-3">
                    <p className="text-red-300 text-xs">{q.erro}</p>
                  </div>
                ) : q.imagemBase64 ? (
                  <div className="bg-white rounded-lg p-2 mb-3">
                    <img src={`data:image/png;base64,${q.imagemBase64}`} alt="QR Code Pix" className="w-full" />
                  </div>
                ) : (
                  <div className="bg-gray-800 rounded-lg h-40 flex items-center justify-center mb-3">
                    <span className="text-gray-500 text-sm">QR Code não disponível</span>
                  </div>
                )}

                {q.pixCopiaCola && (
                  <button onClick={() => copiarPix(q._id, q.pixCopiaCola)}
                    className={`w-full text-xs py-2 px-3 rounded-lg mb-2 transition-colors font-medium ${
                      copiedId === q._id ? 'bg-green-700 text-green-100' : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                    }`}>
                    {copiedId === q._id ? '✓ Copiado!' : '📋 Copiar código Pix'}
                  </button>
                )}

                {q.status === 'pendente' && !q.erro && (
                  <button onClick={() => marcarPago(q._id)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white text-sm py-2 rounded-lg transition-colors font-medium">
                    Marcar como Pago
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
