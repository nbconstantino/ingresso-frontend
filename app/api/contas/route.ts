import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { connectDB } from '@/lib/db/connect'
import Conta from '@/lib/db/models/Conta'
import { encrypt, decrypt } from '@/lib/auth/crypto'

// GET /api/contas — lista contas do usuário logado (sem senhas)
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  await connectDB()
  const userId = (session.user as { id: string }).id
  const contas = await Conta.find({ userId, ativa: true }).select('-senhaEncriptada -cpfEncriptado').lean()

  return NextResponse.json(contas)
}

// POST /api/contas — cadastra nova conta
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const body = await req.json()
    const { nome, email, senha, cpf, telefone, cep, endereco, numero, complemento, bairro, uf, cidadeId, nomeCidade, nascimento, sexo } = body

    // Log de diagnóstico — quais campos estão faltando
    const camposFaltando = Object.entries({ nome, email, senha, cpf, telefone, cep, endereco, numero, bairro, uf, nascimento, sexo })
      .filter(([, v]) => !v || String(v).trim() === '')
      .map(([k]) => k)
    
    if (camposFaltando.length > 0) {
      console.error('Campos faltando:', camposFaltando)
      return NextResponse.json({ error: `Campos obrigatórios faltando: ${camposFaltando.join(', ')}` }, { status: 400 })
    }

    await connectDB()
    const userId = (session.user as { id: string }).id

    const conta = await Conta.create({
      userId,
      nome,
      email,
      senhaEncriptada: encrypt(senha),
      cpfEncriptado: encrypt(cpf.replace(/\D/g, '')),
      telefone,
      cep: cep.replace(/\D/g, ''),
      endereco,
      numero,
      complemento: complemento ?? '',
      bairro,
      uf,
      cidadeId,
      nomeCidade,
      nascimento,
      sexo,
    })

    return NextResponse.json({ ok: true, id: conta._id })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Erro ao salvar conta' }, { status: 500 })
  }
}

// DELETE /api/contas?id=xxx — desativa conta
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  await connectDB()
  const userId = (session.user as { id: string }).id
  await Conta.updateOne({ _id: id, userId }, { ativa: false })

  return NextResponse.json({ ok: true })
}
