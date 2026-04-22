import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { connectDB } from '@/lib/db/connect'
import Convite from '@/lib/db/models/Convite'
import crypto from 'crypto'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session) return null
  if ((session.user as { role?: string }).role !== 'admin') return null
  return session
}

// GET — lista convites
export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  await connectDB()
  const convites = await Convite.find().sort({ createdAt: -1 }).lean()
  return NextResponse.json(convites)
}

// POST — gera novo convite
export async function POST() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  await connectDB()
  const codigo = crypto.randomBytes(4).toString('hex').toUpperCase() // ex: A3F9C2B1
  const userId = (session.user as { id: string }).id
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 dias

  const convite = await Convite.create({ codigo, criadoPor: userId, expiresAt })
  return NextResponse.json({ codigo: convite.codigo, expiresAt: convite.expiresAt })
}

// DELETE — revoga convite
export async function DELETE(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  await connectDB()
  await Convite.deleteOne({ _id: id })
  return NextResponse.json({ ok: true })
}
