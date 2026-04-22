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

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login')
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    Promise.all([
      fetch('/api/contas').then((r) => r.json()),
      fetch('/api/eventos').then((r) => r.json()),
      fetch('/api/qrcodes').then((r) => r.json()),
    ]).then(([contas, eventos, qrcodes]) => {
      setStats({
        contas: Array.isArray(contas) ? contas.length : 0,
        eventos: Array.isArray(eventos) ? eventos.length : 0,
        qrcodes: Array.isArray(qrcodes) ? qrcodes.length : 0,
        pagos: Array.isArray(qrcodes) ? qrcodes.filter((q: { status: string }) => q.status === 'pago').length : 0,
      })
    })
  }, [status])

  if (status === 'loading') return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">Carregando...</div>

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-2">
          Olá, {session?.user?.name} 👋
        </h1>
        <p className="text-gray-400 mb-8">Painel de controle do IngressoBot</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Contas cadastradas', value: stats.contas, color: 'blue' },
            { label: 'Eventos configurados', value: stats.eventos, color: 'purple' },
            { label: 'QR Codes gerados', value: stats.qrcodes, color: 'orange' },
            { label: 'QR Codes pagos', value: stats.pagos, color: 'green' },
          ].map((s) => (
            <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className={`text-3xl font-bold text-${s.color}-400`}>{s.value}</div>
              <div className="text-gray-400 text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        <h2 className="text-lg font-semibold text-white mb-4">Acesso rápido</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { href: '/contas', icon: '👤', title: 'Gerenciar Contas', desc: 'Cadastre as contas do Ingresso Nacional' },
            { href: '/eventos', icon: '🎟️', title: 'Configurar Evento', desc: 'Cole a URL do evento e selecione as contas' },
            { href: '/qrcodes', icon: '📱', title: 'Ver QR Codes', desc: 'Acompanhe os QR Codes Pix gerados' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="bg-gray-900 border border-gray-800 hover:border-orange-500 rounded-xl p-5 transition-colors group"
            >
              <div className="text-3xl mb-3">{item.icon}</div>
              <div className="font-semibold text-white group-hover:text-orange-400 transition-colors">{item.title}</div>
              <div className="text-gray-500 text-sm mt-1">{item.desc}</div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}
