import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { connectDB } from '@/lib/db/connect'
import QRCode from '@/lib/db/models/QRCode'

// GET /api/qrcodes?eventoId=xxx — lista QR Codes de um evento
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const eventoId = req.nextUrl.searchParams.get('eventoId')
  await connectDB()
  const userId = (session.user as { id: string }).id

  const query = eventoId ? { userId, eventoId } : { userId }
  const qrcodes = await QRCode.find(query).sort({ createdAt: -1 }).lean()

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
  await QRCode.updateOne({ _id: id, userId }, { status: 'pago' })

  return NextResponse.json({ ok: true })
}
