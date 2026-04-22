import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { connectDB } from '@/lib/db/connect'
import Evento from '@/lib/db/models/Evento'

// Extrai o ID numérico da URL do evento
// ex: https://www.ingressonacional.com.br/evento/33724/syon-trio-by-douha → "33724"
function extrairEventoId(url: string): string | null {
  const match = url.match(/\/evento\/(\d+)/)
  return match ? match[1] : null
}

// GET /api/eventos — lista eventos do usuário
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  await connectDB()
  const userId = (session.user as { id: string }).id
  const eventos = await Evento.find({ userId }).sort({ createdAt: -1 }).lean()

  return NextResponse.json(eventos)
}

// POST /api/eventos — cria novo evento
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const { url, nome, dataLiberacao, contasSelecionadas } = await req.json()

    if (!url) return NextResponse.json({ error: 'URL obrigatória' }, { status: 400 })

    const eventoId = extrairEventoId(url)
    if (!eventoId) return NextResponse.json({ error: 'URL de evento inválida' }, { status: 400 })

    await connectDB()
    const userId = (session.user as { id: string }).id

    const evento = await Evento.create({
      userId,
      url,
      nome: nome || `Evento ${eventoId}`,
      eventoId,
      dataLiberacao: dataLiberacao ? new Date(dataLiberacao) : undefined,
      contasSelecionadas: contasSelecionadas ?? [],
      status: 'aguardando',
    })

    return NextResponse.json({ ok: true, id: evento._id, eventoId })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Erro ao criar evento' }, { status: 500 })
  }
}

// PATCH /api/eventos?id=xxx — atualiza status ou contas selecionadas
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  const body = await req.json()
  await connectDB()
  const userId = (session.user as { id: string }).id

  await Evento.updateOne({ _id: id, userId }, { $set: body })
  return NextResponse.json({ ok: true })
}

// DELETE /api/eventos?id=xxx
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  await connectDB()
  const userId = (session.user as { id: string }).id
  await Evento.deleteOne({ _id: id, userId, status: { $in: ['aguardando', 'finalizado', 'erro'] } })
  return NextResponse.json({ ok: true })
}
