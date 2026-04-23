'use client'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import Navbar from '@/components/Navbar'

interface Conta { _id: string; nome: string; email: string; telefone: string; nomeCidade: string; uf: string }

const EMPTY = {
  nome: '', email: '', senha: '', cpf: '', telefone: '',
  cep: '', endereco: '', numero: '', complemento: '', bairro: '',
  uf: '', nomeCidade: '', nascimento: '', sexo: 'M',
}

function maskDate(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 8)
  if (d.length <= 2) return d
  if (d.length <= 4) return `${d.slice(0,2)}/${d.slice(2)}`
  return `${d.slice(0,2)}/${d.slice(2,4)}/${d.slice(4)}`
}
function maskTel(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (!d.length) return ''
  if (d.length <= 2) return `(${d}`
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
  const [cepLoading, setCepLoading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { if (status === 'unauthenticated') router.push('/login') }, [status, router])

  const loadContas = useCallback(async () => {
    const res = await fetch('/api/contas')
    if (res.ok) setContas(await res.json())
  }, [])

  useEffect(() => { if (status === 'authenticated') loadContas() }, [status, loadContas])

  // Auto-preenche endereço pelo CEP
  useEffect(() => {
    const raw = form.cep.replace(/\D/g, '')
    if (raw.length !== 8) return
    setCepLoading(true)
    fetch(`/api/cep?cep=${raw}`)
      .then(r => r.json())
      .then(data => {
        if (!data.error) {
          setForm(prev => ({
            ...prev,
            endereco: data.endereco || prev.endereco,
            bairro: data.bairro || prev.bairro,
            uf: data.uf || prev.uf,
            nomeCidade: data.nomeCidade || prev.nomeCidade,
          }))
        }
        setCepLoading(false)
      })
      .catch(() => setCepLoading(false))
  }, [form.cep])

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target
    let v = value
    if (name === 'nascimento') v = maskDate(value)
    else if (name === 'telefone') v = maskTel(value)
    else if (name === 'cpf') v = maskCPF(value)
    else if (name === 'cep') v = maskCEP(value)
    else if (name === 'uf') v = value.toUpperCase().slice(0, 2)
    setForm(prev => ({ ...prev, [name]: v }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')

    // Validação no cliente antes de enviar
    const required = ['nome','email','senha','cpf','telefone','cep','endereco','numero','bairro','uf','nascimento'] as const
    const faltando = required.filter(k => !form[k].trim())
    if (faltando.length > 0) {
      setError(`Preencha: ${faltando.join(', ')}`)
      setLoading(false)
      return
    }

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

  if (status === 'loading') return <div className="min-h-screen t-bg" />

  return (
    <div className="min-h-screen t-bg">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold t-text">Contas de Ingresso</h1>
          <button onClick={() => { setShowForm(!showForm); setError('') }}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            {showForm ? 'Cancelar' : '+ Nova Conta'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="t-card border rounded-xl p-6 mb-6 space-y-4">
            <h2 className="font-semibold t-text">Nova Conta</h2>
            <p className="t-text2 text-xs">Preencha com os dados cadastrados no Ingresso Nacional. O endereço é preenchido automaticamente pelo CEP.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { name: 'nome',       label: 'Nome completo',     type: 'text',     ph: 'Lucas de Oliveira' },
                { name: 'email',      label: 'Email da conta',    type: 'email',    ph: 'email@email.com' },
                { name: 'senha',      label: 'Senha da conta',    type: 'password', ph: '••••••••' },
                { name: 'cpf',        label: 'CPF',               type: 'text',     ph: '000.000.000-00' },
                { name: 'telefone',   label: 'Telefone',          type: 'text',     ph: '(44) 99999-9999' },
                { name: 'nascimento', label: 'Nascimento',        type: 'text',     ph: 'DD/MM/AAAA' },
              ].map(f => (
                <div key={f.name}>
                  <label className="block text-sm t-text2 mb-1">{f.label}</label>
                  <input name={f.name} type={f.type}
                    value={form[f.name as keyof typeof form]}
                    onChange={handleChange} required placeholder={f.ph}
                    autoComplete={f.type === 'password' ? 'new-password' : 'off'}
                    className="w-full t-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500 placeholder-gray-600" />
                </div>
              ))}

              <div>
                <label className="block text-sm t-text2 mb-1">Sexo</label>
                <select name="sexo" value={form.sexo} onChange={handleChange}
                  className="w-full t-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500">
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                </select>
              </div>
            </div>

            <hr className="t-border" />
            <div className="flex items-center gap-2">
              <p className="t-text2 text-xs font-medium">Endereço</p>
              {cepLoading && <span className="text-orange-400 text-xs animate-pulse">Buscando CEP...</span>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { name: 'cep',         label: 'CEP',                        ph: '00000-000',      req: true },
                { name: 'endereco',    label: 'Rua/Avenida',                ph: 'Preenchido pelo CEP', req: true },
                { name: 'numero',      label: 'Número',                     ph: '520',            req: true },
                { name: 'complemento', label: 'Complemento (opcional)',      ph: 'Apto 10',        req: false },
                { name: 'bairro',      label: 'Bairro',                     ph: 'Preenchido pelo CEP', req: true },
                { name: 'uf',          label: 'UF (ex: PR)',                 ph: 'PR',             req: true },
                { name: 'nomeCidade',  label: 'Cidade',                     ph: 'Preenchida pelo CEP', req: true },
              ].map(f => (
                <div key={f.name}>
                  <label className="block text-sm t-text2 mb-1">{f.label}</label>
                  <input name={f.name} type="text"
                    value={form[f.name as keyof typeof form]}
                    onChange={handleChange} required={f.req} placeholder={f.ph}
                    maxLength={f.name === 'uf' ? 2 : undefined}
                    autoComplete="off"
                    className="w-full t-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-500 placeholder-gray-600" />
                </div>
              ))}
            </div>

            <div className="bg-blue-900/30 border border-blue-800 rounded-lg p-3">
              <p className="text-blue-300 text-xs">💡 O ID da cidade é resolvido automaticamente pelo bot durante a compra. Você não precisa preencher.</p>
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button type="submit" disabled={loading}
              className="bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium transition-colors">
              {loading ? 'Salvando...' : 'Salvar Conta'}
            </button>
          </form>
        )}

        {contas.length === 0 ? (
          <div className="text-center py-16 t-text3">
            <div className="text-4xl mb-3">👤</div>
            <p>Nenhuma conta cadastrada ainda.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {contas.map(c => (
              <div key={c._id} className="t-card border rounded-xl px-5 py-4 flex items-center justify-between">
                <div>
                  <div className="font-medium t-text">{c.nome}</div>
                  <div className="t-text2 text-sm">{c.email}</div>
                  <div className="t-text3 text-xs mt-0.5">{c.telefone} · {c.nomeCidade}/{c.uf}</div>
                </div>
                <button onClick={() => handleDelete(c._id)}
                  className="text-red-400 hover:text-red-300 text-sm transition-colors ml-4">Remover</button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
