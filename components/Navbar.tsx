'use client'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import { useTheme } from '@/components/ThemeProvider'

export default function Navbar() {
  const { data: session } = useSession()
  const pathname = usePathname()
  const { theme, toggle } = useTheme()
  const user = session?.user as { role?: string; name?: string } | undefined
  const isAdmin = user?.role === 'admin'

  const links = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/contas',    label: 'Contas' },
    { href: '/eventos',   label: 'Eventos' },
    { href: '/qrcodes',   label: 'QR Codes' },
  ]
  const adminLinks = [
    { href: '/admin/usuarios',  label: 'Usuários' },
    { href: '/admin/relatorios',label: 'Relatórios' },
    { href: '/admin/atividade', label: 'Atividade' },
    { href: '/logs',            label: 'Logs' },
  ]

  return (
    <nav className="t-nav border-b sticky top-0 z-30 px-4 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-1 flex-wrap min-w-0">
        <span className="text-orange-500 font-bold mr-3 shrink-0">🎫 IngressoBot</span>
        {links.map(l => (
          <Link key={l.href} href={l.href}
            className={`px-3 py-1.5 rounded text-sm transition-colors whitespace-nowrap ${
              pathname === l.href ? 'bg-orange-500 text-white' : 't-link t-hover'
            }`}>
            {l.label}
          </Link>
        ))}
        {isAdmin && adminLinks.map(l => (
          <Link key={l.href} href={l.href}
            className={`px-3 py-1.5 rounded text-sm transition-colors whitespace-nowrap ${
              pathname === l.href ? 'bg-purple-600 text-white' : 't-link t-hover'
            }`}>
            {l.label}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <button onClick={toggle}
          title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-base t-card t-border border transition-colors t-hover">
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <span className="text-sm t-text2 hidden sm:block">{user?.name}</span>
        <button onClick={() => signOut({ callbackUrl: '/login' })}
          className="text-sm t-text3 hover:text-red-400 transition-colors">Sair</button>
      </div>
    </nav>
  )
}
