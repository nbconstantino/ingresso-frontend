import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const cep = req.nextUrl.searchParams.get('cep')?.replace(/\D/g, '')
  if (!cep || cep.length !== 8) return NextResponse.json({ error: 'CEP inválido' }, { status: 400 })

  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
    const data = await res.json()
    if (data.erro) return NextResponse.json({ error: 'CEP não encontrado' }, { status: 404 })
    return NextResponse.json({
      endereco:   data.logradouro ?? '',
      bairro:     data.bairro ?? '',
      uf:         data.uf ?? '',
      nomeCidade: data.localidade ?? '',
    })
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar CEP' }, { status: 500 })
  }
}
