'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'

interface Conta {
  _id: string
  nome: string
  email: string
  telefone: string
  nomeCidade: string
  uf: string
  ativa: boolean
  createdAt: string
}

const EMPTY_FORM = {
  nome: '', email: '', senha: '', cpf: '', telefone: '',
  cep: '', endereco: '', numero: '', complemento: '', bairro: '',
  uf: '', cidadeId: '', nomeCidade: '', nascimento: '', sexo: 'M',
}

export default function ContasPage() {
  const { status } = useSession()
  const router = useRouter()
  const [contas, setContas] = useState<Conta[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_FORM })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status, router])

  async function loadContas() {
    const res = await fetch('/api/contas')
    if (res.ok) setContas(await res.json())
  }

  useEffect(() => { if (status === 'authenticated') loadContas() }, [status])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/contas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setLoading(false)

    if (!res.ok) { setError(data.error ?? 'Erro ao salvar'); return }
    setForm({ ...EMPTY_FORM })
    setShowForm(false)
    loadContas()
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover esta conta?')) return
    await fetch(`/api/contas?id=${id}`, { method: 'DELETE' })
    loadContas()
  }

  if (status === 'loading') return <div className="min-h-screen bg-gray-950" />

  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-white">Contas de Ingresso</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {showForm ? 'Cancelar' : '+ Nova Conta'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6 space-y-4">
            <h2 className="font-semibold text-white mb-2">Nova Conta</h2>
            <p className="text-gray-400 text-xs mb-4">
              Preencha os dados exatamente como estão cadastrados no Ingresso Nacional. O endereço é necessário para o checkout.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { name: 'nome', label: 'Nome completo', type: 'text' },
                { name: 'email', label: 'Email da conta', type: 'email' },
                { name: 'senha', label: 'Senha da conta', type: 'password' },
                { name: 'cpf', label: 'CPF (só números)', type: 'text' },
                { name: 'telefone', label: 'Telefone (ex: (44) 99999-9999)', type: 'text' },
                { name: 'nascimento', label: 'Nascimento (DD/MM/AAAA)', type: 'text' },
              ].map((f) => (
                <div key={f.name}>
                  <label className="block text-sm text-gray-400 mb-1">{f.label}</label>
                  <input
                    name={f.name}
                    type={f.type}
                    value={form[f.name as keyof typeof form]}
                    onChange={handleChange}
                    required
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
                  />
                </div>
              ))}

              <div>
                <label className="block text-sm text-gray-400 mb-1">Sexo</label>
                <select
                  name="sexo"
                  value={form.sexo}
                  onChange={handleChange}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
                >
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                </select>
              </div>
            </div>

            <hr className="border-gray-800" />
            <p className="text-gray-400 text-xs font-medium">Endereço (para o checkout)</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { name: 'cep', label: 'CEP (só números)', type: 'text' },
                { name: 'endereco', label: 'Rua/Avenida', type: 'text' },
                { name: 'numero', label: 'Número', type: 'text' },
                { name: 'complemento', label: 'Complemento (opcional)', type: 'text' },
                { name: 'bairro', label: 'Bairro', type: 'text' },
                { name: 'uf', label: 'UF (ex: PR)', type: 'text' },
                { name: 'cidadeId', label: 'ID da cidade no site (ex: 6190)', type: 'text' },
                { name: 'nomeCidade', label: 'Nome da cidade (ex: Maringá)', type: 'text' },
              ].map((f) => (
                <div key={f.name}>
                  <label className="block text-sm text-gray-400 mb-1">{f.label}</label>
                  <input
                    name={f.name}
                    type={f.type}
                    value={form[f.name as keyof typeof form]}
                    onChange={handleChange}
                    required={f.name !== 'complemento'}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500"
                  />
                </div>
              ))}
            </div>

            <div className="bg-blue-900/30 border border-blue-800 rounded-lg p-3">
              <p className="text-blue-300 text-xs">
                💡 <strong>ID da cidade:</strong> Para encontrar, vá em um evento do site, abra o DevTools (F12), Network, faça checkout e procure a request <code>cidades.php</code> — o ID é o número na lista de cidades.
                Para Maringá-PR o ID é <strong>6190</strong>.
              </p>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              {loading ? 'Salvando...' : 'Salvar Conta'}
            </button>
          </form>
        )}

        {contas.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <div className="text-4xl mb-3">👤</div>
            <p>Nenhuma conta cadastrada ainda.</p>
            <p className="text-sm mt-1">Clique em &quot;+ Nova Conta&quot; para começar.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {contas.map((c) => (
              <div key={c._id} className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-white">{c.nome}</div>
                  <div className="text-gray-400 text-sm">{c.email}</div>
                  <div className="text-gray-500 text-xs mt-0.5">{c.telefone} · {c.nomeCidade}/{c.uf}</div>
                </div>
                <button
                  onClick={() => handleDelete(c._id)}
                  className="text-red-400 hover:text-red-300 text-sm transition-colors ml-4"
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
