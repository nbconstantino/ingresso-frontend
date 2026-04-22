'use client'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useRef, useCallback, Suspense } from 'react'
import Navbar from '@/components/Navbar'

interface Log {
  _id: string
  nivel: 'INFO' | 'SUCESSO' | 'AVISO' | 'ERRO' | 'DEBUG'
  msg: string
  ts: string
}

const NIVEL_STYLE: Record<string, { bg: string; text: string; icon: string }> = {
  INFO:    { bg: 'bg-blue-900/20',   text: 'text-blue-300',   icon: 'ℹ️' },
  SUCESSO: { bg: 'bg-green-900/20',  text: 'text-green-300',  icon: '✅' },
  AVISO:   { bg: 'bg-yellow-900/20', text: 'text-yellow-300', icon: '⚠️' },
  ERRO:    { bg: 'bg-red-900/20',    text: 'text-red-300',    icon: '❌' },
  DEBUG:   { bg: 'bg-gray-900/20',   text: 'text-gray-400',   icon: '🔍' },
}

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function LogsContent() {
  const { status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const eventoId = searchParams.get('eventoId')
  const [logs, setLogs] = useState<Log[]>([])
  const [autoScroll, setAutoScroll] = useState(true)
  const [filtro, setFiltro] = useState<string>('TODOS')
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status, router])

  const fetchLogs = useCallback(async () => {
    if (!eventoId) return
    const res = await fetch(`/api/bot/log?eventoId=${eventoId}`)
    if (res.ok) setLogs(await res.json())
  }, [eventoId])

  useEffect(() => {
    if (status !== 'authenticated') return
    fetchLogs()
    const iv = setInterval(fetchLogs, 3000)
    return () => clearInterval(iv)
  }, [status, fetchLogs])

  useEffect(() => {
    if (autoScroll) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs, autoScroll])

  function handleScroll() {
    if (!containerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 100)
  }

  const logsFiltrados = filtro === 'TODOS' ? logs : logs.filter(l => l.nivel === filtro)
  const contadores = { INFO: 0, SUCESSO: 0, AVISO: 0, ERRO: 0 }
  logs.forEach(l => { if (l.nivel in contadores) contadores[l.nivel as keyof typeof contadores]++ })

  if (status === 'loading') return <div className="min-h-screen bg-gray-950" />

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-white transition-colors">← Voltar</button>
          <h1 className="text-2xl font-bold text-white">Log do Bot</h1>
          <div className="ml-auto flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-400 text-xs">Ao vivo</span>
          </div>
        </div>

        {/* Contadores */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {Object.entries(contadores).map(([nivel, count]) => {
            const s = NIVEL_STYLE[nivel]
            return (
              <button key={nivel} onClick={() => setFiltro(filtro === nivel ? 'TODOS' : nivel)}
                className={`${s.bg} border rounded-lg p-3 text-center transition-all ${filtro === nivel ? 'border-orange-500' : 'border-gray-800 hover:border-gray-700'}`}>
                <div className={`text-2xl font-bold ${s.text}`}>{count}</div>
                <div className="text-gray-400 text-xs mt-0.5">{nivel}</div>
              </button>
            )
          })}
        </div>

        {/* Terminal de logs */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <span className="text-gray-400 text-xs font-mono">ingresso-bot — {logs.length} entradas</span>
            <button onClick={() => setAutoScroll(true)} className="text-gray-500 hover:text-gray-300 text-xs transition-colors">
              {autoScroll ? '📌 Auto-scroll ON' : '📌 Ir para o final'}
            </button>
          </div>

          <div ref={containerRef} onScroll={handleScroll}
            className="h-[500px] overflow-y-auto p-4 space-y-1 font-mono text-sm">
            {logsFiltrados.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-600">
                {logs.length === 0 ? 'Aguardando logs do bot...' : 'Nenhum log para o filtro selecionado'}
              </div>
            ) : (
              logsFiltrados.map((l, i) => {
                const s = NIVEL_STYLE[l.nivel] ?? NIVEL_STYLE.INFO
                return (
                  <div key={l._id ?? i} className={`flex gap-3 px-3 py-1.5 rounded ${s.bg}`}>
                    <span className="text-gray-500 shrink-0 text-xs pt-0.5">{formatTime(l.ts)}</span>
                    <span className="text-lg leading-none shrink-0">{s.icon}</span>
                    <span className={`${s.text} break-all`}>{l.msg}</span>
                  </div>
                )
              })
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        {!autoScroll && (
          <button onClick={() => { setAutoScroll(true); bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }}
            className="fixed bottom-6 right-6 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-full shadow-lg transition-colors text-sm">
            ↓ Ir para o final
          </button>
        )}
      </main>
    </div>
  )
}

export default function LogsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950" />}>
      <LogsContent />
    </Suspense>
  )
}
