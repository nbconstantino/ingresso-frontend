'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'
import Link from 'next/link'

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState({ contas: 0, eventos: 0, qrcodes: 0, pagos: 0 })

  useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    Promise.all([
      fetch('/api/contas').then(r => r.json()),
      fetch('/api/eventos').then(r => r.json()),
      fetch('/api/qrcodes').then(r => r.json()),
    ]).then(([c, e, q]) => {
      const contas = Array.isArray(c) ? c.length : 0
      const eventos = Array.isArray(e) ? e.length : 0
      const qrcodes = Array.isArray(q) ? q.length : 0
      const pagos = Array.isArray(q) ? q.filter((x: { status: string }) => x.status === 'pago').length : 0
      setStats({ contas, eventos, qrcodes, pagos })
    }).catch(() => {})
  }, [status])

  const user = session?.user as { name?: string; role?: string } | undefined

  if (status === 'loading') return <div className="min-h-screen t-bg" />

  return (
    <div className="min-h-screen t-bg">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold t-text">Olá, {user?.name?.split(' ')[0]} 👋</h1>
          <p className="t-text2 mt-1">Painel de controle do IngressoBot</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Contas cadastradas', value: stats.contas, color: 'text-orange-400' },
            { label: 'Eventos configurados', value: stats.eventos, color: 'text-blue-400' },
            { label: 'QR Codes gerados', value: stats.qrcodes, color: 'text-purple-400' },
            { label: 'QR Codes pagos', value: stats.pagos, color: 'text-green-400' },
          ].map(s => (
            <div key={s.label} className="t-card border rounded-xl p-4">
              <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
              <div className="t-text2 text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        <h2 className="text-lg font-semibold t-text mb-4">Acesso rápido</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { href: '/contas', icone: '👤', titulo: 'Gerenciar Contas', desc: 'Cadastre as contas do Ingresso Nacional' },
            { href: '/eventos', icone: '🎟️', titulo: 'Configurar Evento', desc: 'Cole a URL do evento e selecione as contas' },
            { href: '/qrcodes?status=pendente', icone: '📱', titulo: 'Ver QR Codes', desc: 'Acompanhe os QR Codes Pix gerados' },
          ].map(item => (
            <Link key={item.href} href={item.href}
              className="t-card border rounded-xl p-5 hover:border-orange-500 transition-colors group block">
              <div className="text-3xl mb-3">{item.icone}</div>
              <div className="font-semibold t-text group-hover:text-orange-400 transition-colors">{item.titulo}</div>
              <div className="t-text2 text-sm mt-1">{item.desc}</div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
