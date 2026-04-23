'use client'
import { useSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, useCallback, Suspense } from 'react'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

interface LogEntry { nivel: string; msg: string; ts: string }

const MENSAGENS: Record<string, { icone: string; texto: string }> = {
  'Login':         { icone: '🔐', texto: 'Fazendo login na conta' },
  'login':         { icone: '🔐', texto: 'Fazendo login na conta' },
  'Login OK':      { icone: '✅', texto: 'Login realizado com sucesso' },
  'Ingresso:':     { icone: '🎟️', texto: 'Ingresso selecionado' },
  'carrinho':      { icone: '🛒', texto: 'Adicionando ao carrinho' },
  'reserva':       { icone: '📋', texto: 'Criando reserva' },
  'Reserva OK':    { icone: '✅', texto: 'Reserva criada com sucesso' },
  'checkout':      { icone: '💳', texto: 'Processando pagamento' },
  'Token':         { icone: '🔑', texto: 'Redirecionando para pagamento' },
  'gateway':       { icone: '🏦', texto: 'Acessando gateway de pagamento' },
  'Gateway':       { icone: '🏦', texto: 'Acessando gateway de pagamento' },
  'Proteção':      { icone: '🛡️', texto: 'Configurando pagamento' },
  'PIX':           { icone: '📱', texto: 'Selecionando pagamento PIX' },
  'Pedido finalizado': { icone: '⏳', texto: 'Finalizando pedido' },
  'QR Code':       { icone: '📲', texto: 'QR Code gerado!' },
  'COMPRA':        { icone: '🎉', texto: 'Compra concluída com sucesso!' },
  'Monitorando':   { icone: '👀', texto: 'Aguardando ingressos ficarem disponíveis...' },
  'Ingressos':     { icone: '🎟️', texto: 'Ingressos encontrados!' },
  'BOT INICIADO':  { icone: '🤖', texto: 'Bot iniciado' },
  'FINALIZADO':    { icone: '✅', texto: 'Processo finalizado' },
}

function friendlyMsg(msg: string): { icone: string; texto: string } | null {
  for (const [key, val] of Object.entries(MENSAGENS)) {
    if (msg.includes(key)) return val
  }
  return null
}

function StatusContent() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const params = useSearchParams()
  const eventoId = params.get('eventoId')
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [fase, setFase] = useState('aguardando')

  useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status, router])

  const load = useCallback(async () => {
    const url = eventoId ? `/api/bot/log?eventoId=${eventoId}` : '/api/bot/log'
    const res = await fetch(url)
    if (res.ok) {
      const data = await res.json()
      setLogs(data.logs ?? [])
      // Determina fase atual
      const msgs = (data.logs ?? []).map((l: LogEntry) => l.msg).join(' ')
      if (msgs.includes('COMPRA CONCLUÍDA')) setFase('concluido')
      else if (msgs.includes('QR Code') || msgs.includes('FINALIZADO')) setFase('qrcode')
      else if (msgs.includes('gateway') || msgs.includes('Gateway') || msgs.includes('PIX')) setFase('pagamento')
      else if (msgs.includes('checkout') || msgs.includes('Token')) setFase('checkout')
      else if (msgs.includes('reserva') || msgs.includes('Reserva')) setFase('reserva')
      else if (msgs.includes('carrinho') || msgs.includes('Ingresso:')) setFase('carrinho')
      else if (msgs.includes('Login OK')) setFase('login')
      else if (msgs.includes('Ingressos encontrados')) setFase('encontrado')
      else if (msgs.includes('Monitorando') || msgs.includes('BOT INICIADO')) setFase('monitorando')
    }
  }, [eventoId])

  useEffect(() => { if (status === 'authenticated') load() }, [status, load])
  useEffect(() => {
    if (fase === 'concluido') return
    const iv = setInterval(load, 4000)
    return () => clearInterval(iv)
  }, [fase, load])

  const etapas = [
    { id: 'monitorando', icone: '👀', label: 'Monitorando' },
    { id: 'encontrado',  icone: '🎟️', label: 'Ingressos encontrados' },
    { id: 'login',       icone: '🔐', label: 'Login' },
    { id: 'carrinho',    icone: '🛒', label: 'Carrinho' },
    { id: 'reserva',     icone: '📋', label: 'Reserva' },
    { id: 'checkout',    icone: '💳', label: 'Checkout' },
    { id: 'pagamento',   icone: '📱', label: 'Pagamento PIX' },
    { id: 'qrcode',      icone: '📲', label: 'QR Code gerado' },
    { id: 'concluido',   icone: '🎉', label: 'Concluído!' },
  ]
  const faseIdx = etapas.findIndex(e => e.id === fase)

  // Filtra logs para mostrar apenas mensagens amigáveis
  const logsAmigaveis = logs
    .map(l => ({ ...l, friendly: friendlyMsg(l.msg) }))
    .filter(l => l.friendly && l.nivel !== 'DEBUG')
    .slice(-8)

  if (status === 'loading') return <div className="min-h-screen t-bg" />

  return (
    <div className="min-h-screen t-bg">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">{etapas[faseIdx]?.icone ?? '🤖'}</div>
          <h1 className="text-2xl font-bold t-text">{etapas[faseIdx]?.label ?? 'Aguardando'}</h1>
          {fase !== 'concluido' && (
            <p className="t-text2 text-sm mt-2">O bot está trabalhando automaticamente...</p>
          )}
        </div>

        {/* Barra de progresso por etapas */}
        <div className="flex items-center justify-between mb-10 overflow-x-auto pb-2">
          {etapas.map((e, i) => (
            <div key={e.id} className="flex items-center">
              <div className={`flex flex-col items-center ${i <= faseIdx ? '' : 'opacity-30'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 transition-all ${
                  i < faseIdx ? 'bg-green-500 border-green-500 text-white' :
                  i === faseIdx ? 'bg-orange-500 border-orange-500 text-white animate-pulse' :
                  't-card border t-border t-text3'
                }`}>{i < faseIdx ? '✓' : e.icone}</div>
                <span className="text-xs t-text3 mt-1 hidden sm:block w-16 text-center leading-tight">{e.label}</span>
              </div>
              {i < etapas.length - 1 && (
                <div className={`w-6 h-0.5 mx-1 transition-all ${i < faseIdx ? 'bg-green-500' : 't-border bg-current'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Atividade recente */}
        {logsAmigaveis.length > 0 && (
          <div className="t-card border rounded-xl p-5 mb-6">
            <h2 className="text-sm font-medium t-text2 mb-4">Atividade recente</h2>
            <div className="space-y-3">
              {logsAmigaveis.map((l, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-xl shrink-0">{l.friendly!.icone}</span>
                  <div>
                    <p className="t-text text-sm">{l.friendly!.texto}</p>
                    <p className="t-text3 text-xs">{new Date(l.ts).toLocaleTimeString('pt-BR')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {fase === 'concluido' && (
          <div className="text-center">
            <div className="bg-green-900/30 border border-green-700 rounded-xl p-6 mb-4">
              <p className="text-green-300 font-medium">🎉 Compra realizada com sucesso!</p>
              <p className="text-green-400 text-sm mt-1">Seu QR Code Pix está pronto para pagamento.</p>
            </div>
            <Link href={eventoId ? `/qrcodes?eventoId=${eventoId}` : '/qrcodes'}
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-medium inline-block">
              📱 Ver QR Code
            </Link>
          </div>
        )}

        {fase === 'monitorando' && (
          <div className="text-center t-text3 text-sm">
            <div className="animate-spin text-2xl mb-2">⏳</div>
            <p>Verificando disponibilidade de ingressos a cada 5 segundos...</p>
          </div>
        )}
      </main>
    </div>
  )
}

export default function StatusPage() {
  return <Suspense fallback={<div className="min-h-screen t-bg" />}><StatusContent /></Suspense>
}
