import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { connectDB } from '@/lib/db/connect'
import User from '@/lib/db/models/User'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session) return null
  const user = session.user as { role?: string }
  if (user.role !== 'admin') return null
  return session
}

// GET /api/admin/usuarios
export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  await connectDB()
  const users = await User.find().select('-passwordHash').lean()
  return NextResponse.json(users)
}

// PATCH /api/admin/usuarios?id=xxx — altera ativo/maxQRCodesPerMonth/role
export async function PATCH(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  const body = await req.json()
  const allowed = ['ativo', 'maxQRCodesPerMonth', 'role']
  const update: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) update[key] = body[key]
  }

  await connectDB()
  await User.updateOne({ _id: id }, { $set: update })
  return NextResponse.json({ ok: true })
}
