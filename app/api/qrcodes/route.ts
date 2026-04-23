import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { connectDB } from '@/lib/db/connect'
import QRCode from '@/lib/db/models/QRCode'

// GET /api/qrcodes?eventoId=xxx — lista QR Codes de um evento
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const eventoIdFilter = req.nextUrl.searchParams.get('eventoId')
  await connectDB()
  const userId = (session.user as { id: string; role?: string }).id
  const role = (session.user as { role?: string }).role

  // Admin pode ver todos, usuário vê só os seus
  const baseQuery: Record<string, unknown> = role === 'admin' ? {} : { userId }
  if (eventoIdFilter) baseQuery.eventoId = eventoIdFilter
  const qrcodes = await QRCode.find(baseQuery).sort({ createdAt: -1 }).lean()

  return NextResponse.json(qrcodes)
}

// PATCH /api/qrcodes?id=xxx — marca como pago
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  await connectDB()
  const userId = (session.user as { id: string }).id
  const { status: newStatus } = await req.json().catch(() => ({ status: 'pago' }))
  const validStatus = ['pago', 'expirado'].includes(newStatus) ? newStatus : 'pago'
  await QRCode.updateOne({ _id: id, userId }, { status: validStatus })

  return NextResponse.json({ ok: true })
}
