'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import Navbar from '@/components/Navbar'

interface Conta {
  _id: string; nome: string; email: string
  telefone: string; nomeCidade: string; uf: string
}

interface Cidade { IDCidade: string; Nome: string }

const EMPTY = {
  nome: '', email: '', senha: '', cpf: '', telefone: '',
  cep: '', endereco: '', numero: '', complemento: '', bairro: '',
  uf: '', cidadeId: '', nomeCidade: '', nascimento: '', sexo: 'M',
}

// ── Máscaras ──────────────────────────────────────────────────────────────────
function maskData(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 8)
  if (d.length <= 2) return d
  if (d.length <= 4) return `${d.slice(0,2)}/${d.slice(2)}`
  return `${d.slice(0,2)}/${d.slice(2,4)}/${d.slice(4)}`
}

function maskTel(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 7) return `(${d.slice(0,2)}) ${d.slice(2)}`
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
}

function maskCPF(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0,3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6)}`
  return `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}`
}

function maskCEP(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 8)
  if (d.length <= 5) return d
  return `${d.slice(0,5)}-${d.slice(5)}`
}

export default function ContasPage() {
  const { status } = useSession()
  const router = useRouter()
  const [contas, setContas] = useState<Conta[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...EMPTY })
  const [cidades, setCidades] = useState<Cidade[]>([])
  const [loadingCidades, setLoadingCidades] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status, router])

  const loadContas = useCallback(async () => {
    const res = await fetch('/api/contas')
    if (res.ok) setContas(await res.json())
  }, [])

  useEffect(() => { if (status === 'authenticated') loadContas() }, [status, loadContas])

  // Busca cidades quando UF muda
  useEffect(() => {
    if (!form.uf || form.uf.length !== 2) { setCidades([]); return }
    setLoadingCidades(true)
    fetch(`/api/evento-info?uf=${form.uf.toUpperCase()}`)
      .then(r => r.json())
      .then(data => {
        setCidades(Array.isArray(data.cidades) ? data.cidades : [])
        setLoadingCidades(false)
      })
      .catch(() => setLoadingCidades(false))
  }, [form.uf])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target
    let v = value
    if (name === 'nascimento') v = maskData(value)
    else if (name === 'telefone') v = maskTel(value)
    else if (name === 'cpf') v = maskCPF(value)
    else if (name === 'cep') v = maskCEP(value)
    setForm(prev => ({ ...prev, [name]: v }))
  }

  function handleCidadeChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value
    const cidade = cidades.find(c => c.IDCidade === id)
    setForm(prev => ({ ...prev, cidadeId: id, nomeCidade: cidade?.Nome ?? '' }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const res = await fetch('/api/contas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) { setError(data.error ?? 'Erro ao salvar'); return }
    setForm({ ...EMPTY }); setShowForm(false); loadContas()
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
          <button onClick={() => setShowForm(!showForm)}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            {showForm ? 'Cancelar' : '+ Nova Conta'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6 space-y-4">
            <h2 className="font-semibold text-white">Nova Conta</h2>
            <p className="text-gray-400 text-xs">Preencha com os dados cadastrados no Ingresso Nacional.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { name: 'nome', label: 'Nome completo', type: 'text', placeholder: 'LUCAS DE OLIVEIRA' },
                { name: 'email', label: 'Email da conta', type: 'email', placeholder: 'email@email.com' },
                { name: 'senha', label: 'Senha da conta', type: 'password', placeholder: '••••••••' },
                { name: 'cpf', label: 'CPF', type: 'text', placeholder: '000.000.000-00' },
                { name: 'telefone', label: 'Telefone', type: 'text', placeholder: '(44) 99999-9999' },
                { name: 'nascimento', label: 'Nascimento', type: 'text', placeholder: 'DD/MM/AAAA' },
              ].map(f => (
                <div key={f.name}>
                  <label className="block text-sm text-gray-400 mb-1">{f.label}</label>
                  <input name={f.name} type={f.type} value={form[f.name as keyof typeof form]}
                    onChange={handleChange} required placeholder={f.placeholder}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500 placeholder-gray-600" />
                </div>
              ))}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Sexo</label>
                <select name="sexo" value={form.sexo} onChange={handleChange}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500">
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                </select>
              </div>
            </div>

            <hr className="border-gray-800" />
            <p className="text-gray-400 text-xs font-medium">Endereço</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { name: 'cep', label: 'CEP', type: 'text', placeholder: '00000-000' },
                { name: 'endereco', label: 'Rua/Avenida', type: 'text', placeholder: 'Rua Caramuru' },
                { name: 'numero', label: 'Número', type: 'text', placeholder: '520' },
                { name: 'complemento', label: 'Complemento (opcional)', type: 'text', placeholder: 'Apto 10' },
                { name: 'bairro', label: 'Bairro', type: 'text', placeholder: 'Zona 06' },
                { name: 'uf', label: 'Estado (UF)', type: 'text', placeholder: 'PR' },
              ].map(f => (
                <div key={f.name}>
                  <label className="block text-sm text-gray-400 mb-1">{f.label}</label>
                  <input name={f.name} type={f.type}
                    value={form[f.name as keyof typeof form]}
                    onChange={handleChange} required={f.name !== 'complemento'}
                    placeholder={f.placeholder}
                    maxLength={f.name === 'uf' ? 2 : undefined}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500 placeholder-gray-600"
                  />
                </div>
              ))}

              <div className="md:col-span-2">
                <label className="block text-sm text-gray-400 mb-1">Cidade</label>
                {loadingCidades ? (
                  <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-gray-400 text-sm">Carregando cidades...</div>
                ) : cidades.length > 0 ? (
                  <select value={form.cidadeId} onChange={handleCidadeChange} required
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-orange-500">
                    <option value="">Selecione a cidade</option>
                    {cidades.map(c => (
                      <option key={c.IDCidade} value={c.IDCidade}>{c.Nome}</option>
                    ))}
                  </select>
                ) : (
                  <div className="text-gray-500 text-sm py-2">
                    {form.uf.length === 2 ? 'Nenhuma cidade encontrada para este estado' : 'Preencha o UF acima para carregar as cidades'}
                  </div>
                )}
              </div>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button type="submit" disabled={loading}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium transition-colors">
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
            {contas.map(c => (
              <div key={c._id} className="bg-gray-900 border border-gray-800 rounded-xl px-5 py-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-white">{c.nome}</div>
                  <div className="text-gray-400 text-sm">{c.email}</div>
                  <div className="text-gray-500 text-xs mt-0.5">{c.telefone} · {c.nomeCidade}/{c.uf}</div>
                </div>
                <button onClick={() => handleDelete(c._id)}
                  className="text-red-400 hover:text-red-300 text-sm transition-colors ml-4">
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
