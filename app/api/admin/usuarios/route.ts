import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { connectDB } from '@/lib/db/connect'
import User from '@/lib/db/models/User'
import { hashPassword } from '@/lib/auth/password'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session) return null
  if ((session.user as { role?: string }).role !== 'admin') return null
  return session
}

export async function GET() {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  await connectDB()
  const users = await User.find().select('-passwordHash').lean()
  return NextResponse.json(users)
}

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  const body = await req.json()
  await connectDB()

  // Permite alterar: ativo, maxQRCodesPerMonth, role, name, email, password
  const update: Record<string, unknown> = {}
  const allowed = ['ativo', 'maxQRCodesPerMonth', 'role', 'name', 'email']
  for (const key of allowed) {
    if (key in body) update[key] = body[key]
  }

  // Troca de senha pelo admin
  if (body.newPassword) {
    if (body.newPassword.length < 6) {
      return NextResponse.json({ error: 'Senha deve ter no mínimo 6 caracteres' }, { status: 400 })
    }
    update.passwordHash = await hashPassword(body.newPassword)
  }

  await User.updateOne({ _id: id }, { $set: update })
  return NextResponse.json({ ok: true })
}
