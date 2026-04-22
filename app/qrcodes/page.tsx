'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import Navbar from '@/components/Navbar'

interface QRCode {
  _id: string
  nomeEvento: string
  nomeConta: string
  imagemBase64: string
  pixCopiaCola: string
  status: 'pendente' | 'pago'
  createdAt: string
}

export default function QRCodesPage() {
  const { status } = useSession()
  const router = useRouter()
  const [qrcodes, setQrcodes] = useState<QRCode[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<'todos' | 'pendente' | 'pago'>('todos')

  useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status, router])

  const load = useCallback(async () => {
    const res = await fetch('/api/qrcodes')
    if (res.ok) setQrcodes(await res.json())
  }, [])

  useEffect(() => { if (status === 'authenticated') load() }, [status, load])

  // Polling automático enquanto há QR Codes pendentes recentes
  useEffect(() => {
    const temPendente = qrcodes.some((q) => q.status === 'pendente')
    if (!temPendente) return
    const interval = setInterval(load, 8000)
    return () => clearInterval(interval)
  }, [qrcodes, load])

  async function marcarPago(id: string) {
    await fetch(`/api/qrcodes?id=${id}`, { method: 'PATCH' })
    setQrcodes((prev) => prev.map((q) => q._id === id ? { ...q, status: 'pago' } : q))
  }

  async function copiarPix(id: string, texto: string) {
    await navigator.clipboard.writeText(texto)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const filtrados = qrcodes.filter((q) => filtro === 'todos' || q.status === filtro)
  const pendentes = qrcodes.filter((q) => q.status === 'pendente').length
  const pagos = qrcodes.filter((q) => q.status === 'pago').length

  if (status === 'loading') return <div className="min-h-screen bg-gray-950" />

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">QR Codes Pix</h1>
            <p className="text-gray-400 text-sm mt-1">
              {pendentes} pendente(s) · {pagos} pago(s) · {qrcodes.length} total
            </p>
          </div>
          <div className="flex gap-2">
            {(['todos', 'pendente', 'pago'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className={`px-3 py-1.5 rounded text-sm transition-colors capitalize ${
                  filtro === f ? 'bg-orange-500 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                {f === 'todos' ? 'Todos' : f === 'pendente' ? 'Pendentes' : 'Pagos'}
              </button>
            ))}
          </div>
        </div>

        {filtrados.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <div className="text-4xl mb-3">📱</div>
            <p>Nenhum QR Code ainda.</p>
            <p className="text-sm mt-1">Configure um evento e inicie o bot para gerar QR Codes Pix.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtrados.map((q) => (
              <div
                key={q._id}
                className={`bg-gray-900 border rounded-xl p-4 transition-colors ${
                  q.status === 'pago' ? 'border-green-700 opacity-75' : 'border-gray-800'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-white font-medium text-sm">{q.nomeConta}</div>
                    <div className="text-gray-400 text-xs mt-0.5">{q.nomeEvento}</div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    q.status === 'pago' ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'
                  }`}>
                    {q.status === 'pago' ? '✓ Pago' : '⏳ Pendente'}
                  </span>
                </div>

                {/* QR Code image */}
                {q.imagemBase64 ? (
                  <div className="bg-white rounded-lg p-2 mb-3">
                    <img
                      src={`data:image/png;base64,${q.imagemBase64}`}
                      alt="QR Code Pix"
                      className="w-full"
                    />
                  </div>
                ) : (
                  <div className="bg-gray-800 rounded-lg h-48 flex items-center justify-center mb-3">
                    <span className="text-gray-500 text-sm">QR Code não disponível</span>
                  </div>
                )}

                {/* Pix copia e cola */}
                {q.pixCopiaCola && (
                  <button
                    onClick={() => copiarPix(q._id, q.pixCopiaCola)}
                    className={`w-full text-xs py-2 px-3 rounded-lg mb-2 transition-colors font-medium ${
                      copiedId === q._id
                        ? 'bg-green-700 text-green-100'
                        : 'bg-gray-800 hover:bg-gray-700 text-gray-300'
                    }`}
                  >
                    {copiedId === q._id ? '✓ Copiado!' : '📋 Copiar código Pix'}
                  </button>
                )}

                {/* Botão marcar como pago */}
                {q.status === 'pendente' && (
                  <button
                    onClick={() => marcarPago(q._id)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white text-sm py-2 rounded-lg transition-colors font-medium"
                  >
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
