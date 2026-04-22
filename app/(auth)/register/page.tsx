'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.password !== form.confirm) {
      setError('Senhas não coincidem')
      return
    }
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'Erro ao criar conta')
    } else {
      router.push('/login')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🎫</div>
          <h1 className="text-2xl font-bold text-white">Criar Conta</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-xl p-6 space-y-4 border border-gray-800">
          {(['name', 'email', 'password', 'confirm'] as const).map((field) => (
            <div key={field}>
              <label className="block text-sm text-gray-400 mb-1">
                {{ name: 'Nome', email: 'Email', password: 'Senha', confirm: 'Confirmar Senha' }[field]}
              </label>
              <input
                type={field.includes('password') || field === 'confirm' ? 'password' : field === 'email' ? 'email' : 'text'}
                value={form[field]}
                onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                required
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-orange-500"
              />
            </div>
          ))}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-medium py-2 rounded-lg transition-colors"
          >
            {loading ? 'Criando...' : 'Criar Conta'}
          </button>

          <p className="text-center text-sm text-gray-500">
            Já tem conta?{' '}
            <Link href="/login" className="text-orange-400 hover:underline">
              Fazer login
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
