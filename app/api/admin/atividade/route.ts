import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { connectDB } from '@/lib/db/connect'
import AtividadeLog from '@/lib/db/models/AtividadeLog'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session) return null
  if ((session.user as { role?: string }).role !== 'admin') return null
  return session
}

export async function GET(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  await connectDB()
  const page = parseInt(req.nextUrl.searchParams.get('page') ?? '1')
  const limit = 50
  const skip = (page - 1) * limit

  const [logs, total] = await Promise.all([
    AtividadeLog.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    AtividadeLog.countDocuments(),
  ])

  return NextResponse.json({ logs, total, pages: Math.ceil(total / limit) })
}
