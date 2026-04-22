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

  return (
    <nav className="bg-gray-900 dark:bg-gray-900 light:bg-white border-b border-gray-800 dark:border-gray-800 light:border-gray-200 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <span className="text-orange-500 font-bold text-lg">🎫 IngressoBot</span>
        <div className="flex gap-1 flex-wrap">
          {links.map(l => (
            <Link key={l.href} href={l.href}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                pathname === l.href
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-400 dark:text-gray-400 hover:text-white hover:bg-gray-800'
              }`}>
              {l.label}
            </Link>
          ))}
          {isAdmin && (
            <Link href="/admin/usuarios"
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                pathname.startsWith('/admin') ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}>
              Admin
            </Link>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button onClick={toggle}
          title={theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-lg bg-gray-800 hover:bg-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
          style={theme === 'light' ? { backgroundColor: '#e5e7eb' } : {}}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <span className="text-sm text-gray-400 dark:text-gray-400" style={theme === 'light' ? { color: '#6b7280' } : {}}>{user?.name}</span>
        <button onClick={() => signOut({ callbackUrl: '/login' })}
          className="text-sm text-gray-500 hover:text-red-400 transition-colors">
          Sair
        </button>
      </div>
    </nav>
  )
}
