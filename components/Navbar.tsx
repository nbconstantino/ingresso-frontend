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
    { href: '/contas', label: 'Contas' },
    { href: '/eventos', label: 'Eventos' },
    { href: '/qrcodes', label: 'QR Codes' },
  ]

  const navBg = theme === 'light'
    ? 'bg-white border-gray-200'
    : 'bg-gray-900 border-gray-800'
  const linkInactive = theme === 'light'
    ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
    : 'text-gray-400 hover:text-white hover:bg-gray-800'
  const themeBtnBg = theme === 'light'
    ? 'bg-gray-100 hover:bg-gray-200'
    : 'bg-gray-800 hover:bg-gray-700'
  const nameColor = theme === 'light' ? 'text-gray-600' : 'text-gray-400'

  return (
    <nav className={`${navBg} border-b px-4 py-3 flex items-center justify-between`}>
      <div className="flex items-center gap-4">
        <span className="text-orange-500 font-bold text-lg">🎫 IngressoBot</span>
        <div className="flex gap-1 flex-wrap">
          {links.map(l => (
            <Link key={l.href} href={l.href}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                pathname === l.href ? 'bg-orange-500 text-white' : linkInactive
              }`}>
              {l.label}
            </Link>
          ))}
          {isAdmin && (
            <Link href="/admin/usuarios"
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                pathname.startsWith('/admin') ? 'bg-purple-600 text-white' : linkInactive
              }`}>
              Admin
            </Link>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={toggle} title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
          className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-colors ${themeBtnBg}`}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <span className={`${nameColor} text-sm`}>{user?.name}</span>
        <button onClick={() => signOut({ callbackUrl: '/login' })}
          className="text-sm text-gray-500 hover:text-red-400 transition-colors">
          Sair
        </button>
      </div>
    </nav>
  )
}
