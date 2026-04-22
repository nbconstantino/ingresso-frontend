'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '', codigo: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isFirst, setIsFirst] = useState<boolean | null>(null)

  async function checkFirst() {
    if (isFirst !== null) return
    try {
      const res = await fetch('/api/auth/check-first')
      if (res.ok) { const d = await res.json(); setIsFirst(d.isFirst) }
    } catch {}
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password !== form.confirm) { setError('Senhas não coincidem'); return }
    setLoading(true); setError('')
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, email: form.email, password: form.password, codigo: form.codigo || undefined }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'Erro ao criar conta'); return }
    router.push('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🎫</div>
          <h1 className="text-2xl font-bold text-white">Criar Conta</h1>
          {isFirst === false && <p className="text-yellow-400 text-sm mt-2">⚠️ Código de convite necessário</p>}
        </div>
        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-xl p-6 space-y-4 border border-gray-800">
          {[
            { key: 'name', label: 'Nome', type: 'text' },
            { key: 'email', label: 'Email', type: 'email' },
            { key: 'password', label: 'Senha', type: 'password' },
            { key: 'confirm', label: 'Confirmar Senha', type: 'password' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-sm text-gray-400 mb-1">{f.label}</label>
              <input type={f.type}
                value={form[f.key as keyof typeof form]}
                onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                onFocus={f.key === 'name' ? checkFirst : undefined}
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500" />
            </div>
          ))}
          {isFirst === false && (
            <div>
              <label className="block text-sm text-gray-400 mb-1">Código de Convite <span className="text-red-400">*</span></label>
              <input type="text" value={form.codigo}
                onChange={e => setForm({ ...form, codigo: e.target.value.toUpperCase() })}
                placeholder="Ex: A3F9C2B1" maxLength={8}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono tracking-widest text-center focus:outline-none focus:border-orange-500 placeholder-gray-600" />
              <p className="text-gray-500 text-xs mt-1">Solicite ao administrador.</p>
            </div>
          )}
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-medium py-2 rounded-lg transition-colors">
            {loading ? 'Criando...' : 'Criar Conta'}
          </button>
          <p className="text-center text-sm text-gray-500">
            Já tem conta?{' '}
            <Link href="/login" className="text-orange-400 hover:underline">Fazer login</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
