import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { connectDB } from '@/lib/db/connect'
import SolicitacaoExclusao from '@/lib/db/models/SolicitacaoExclusao'
import Evento from '@/lib/db/models/Evento'
import { registrarAtividade } from '@/lib/atividade'

// GET — lista solicitações pendentes (admin)
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const u = session.user as { role?: string }
  if (u.role !== 'admin') return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  await connectDB()
  const solic = await SolicitacaoExclusao.find({ status: 'pendente' }).sort({ createdAt: -1 }).lean()
  return NextResponse.json(solic)
}

// POST — solicitar exclusão (usuário)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { eventoId, motivo } = await req.json()
  if (!eventoId) return NextResponse.json({ error: 'eventoId obrigatório' }, { status: 400 })

  await connectDB()
  const userId = (session.user as { id: string }).id
  const u = session.user as { role?: string; name?: string }

  const evento = await Evento.findOne({ _id: eventoId, userId })
  if (!evento) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })

  // Admin pode deletar direto
  if (u.role === 'admin') {
    await Evento.deleteOne({ _id: eventoId })
    await registrarAtividade(userId, u.name ?? '', 'deletar_evento', `Evento: ${evento.nome}`)
    return NextResponse.json({ ok: true, deletado: true })
  }

  // Usuário cria solicitação
  const existing = await SolicitacaoExclusao.findOne({ eventoId, status: 'pendente' })
  if (existing) return NextResponse.json({ ok: true, jasolicitado: true })

  await SolicitacaoExclusao.create({
    eventoId, userId, nomeEvento: evento.nome, motivo: motivo || ''
  })
  await registrarAtividade(userId, u.name ?? '', 'solicitar_exclusao_evento', `Evento: ${evento.nome}`)
  return NextResponse.json({ ok: true, solicitado: true })
}

// PATCH — admin aprova/rejeita
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  const u = session.user as { role?: string; name?: string; id: string }
  if (u.role !== 'admin') return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const { solicitacaoId, acao } = await req.json() // acao: 'aprovar' | 'rejeitar'
  await connectDB()

  const solic = await SolicitacaoExclusao.findById(solicitacaoId)
  if (!solic) return NextResponse.json({ error: 'Solicitação não encontrada' }, { status: 404 })

  if (acao === 'aprovar') {
    await Evento.deleteOne({ _id: solic.eventoId })
    solic.status = 'aprovada'
    await registrarAtividade(u.id, u.name ?? '', 'aprovar_exclusao_evento', `Evento: ${solic.nomeEvento}`)
  } else {
    solic.status = 'rejeitada'
  }
  await solic.save()
  return NextResponse.json({ ok: true })
}
