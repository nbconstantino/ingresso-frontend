'use client'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/components/ThemeProvider'
import { useState } from 'react'

export default function Navbar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const { theme, toggle } = useTheme()
  const [warming, setWarming] = useState(false)
  const [warmStatus, setWarmStatus] = useState<null | 'ok' | 'err'>(null)
  const user = session?.user as { role?: string; name?: string } | undefined
  const isAdmin = user?.role === 'admin'

  const links = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/contas',    label: 'Contas' },
    { href: '/eventos',   label: 'Eventos' },
    { href: '/qrcodes',   label: 'QR Codes' },
  ]
  const adminLinks = [
    { href: '/admin/usuarios',   label: 'Usuários' },
    { href: '/admin/relatorios', label: 'Relatórios' },
    { href: '/admin/atividade',  label: 'Atividade' },
    { href: '/logs',             label: 'Logs' },
  ]

  async function warmUp() {
    setWarming(true); setWarmStatus(null)
    try {
      const res = await fetch('/api/bot/warmup', { method: 'POST' })
      const data = await res.json()
      setWarmStatus(data.ok ? 'ok' : 'err')
    } catch { setWarmStatus('err') }
    setWarming(false)
    setTimeout(() => setWarmStatus(null), 3000)
  }

  return (
    <nav className="t-nav border-b sticky top-0 z-40 shadow-sm">
      <div className="flex items-center justify-between px-4 py-2.5 gap-3">
        {/* Logo */}
        <Link href="/dashboard" className="text-orange-500 font-bold text-base shrink-0">🎫 IBot</Link>

        {/* Links — scroll horizontal no mobile */}
        <div className="nav-scroll flex items-center gap-0.5 flex-1 min-w-0">
          {links.map(l => (
            <Link key={l.href} href={l.href}
              className={`px-2.5 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                pathname === l.href ? 'bg-orange-500 text-white' : 't-link t-hover'
              }`}>
              {l.label}
            </Link>
          ))}
          {isAdmin && adminLinks.map(l => (
            <Link key={l.href} href={l.href}
              className={`px-2.5 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                pathname === l.href ? 'bg-purple-600 text-white' : 't-link t-hover'
              }`}>
              {l.label}
            </Link>
          ))}
        </div>

        {/* Ações */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Warm-up Render */}
          <button onClick={warmUp} disabled={warming}
            title="Acordar o servidor do bot"
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all ${
              warmStatus === 'ok' ? 'bg-green-700 text-green-200' :
              warmStatus === 'err' ? 'bg-red-700 text-red-200' :
              'btn-ghost !min-h-0 !h-8'
            }`}>
            {warming ? <span className="animate-spin">⚡</span> : warmStatus === 'ok' ? '✓' : warmStatus === 'err' ? '✗' : '⚡'}
          </button>

          {/* Tema */}
          <button onClick={toggle} title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            className="btn-ghost !min-h-0 w-8 h-8 flex items-center justify-center text-sm rounded-lg">
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>

          {/* Sair */}
          <button onClick={() => signOut({ callbackUrl: '/login' })}
            className="text-xs t-text3 hover:text-red-400 transition-colors px-1">Sair</button>
        </div>
      </div>
    </nav>
  )
}
