import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { connectDB } from '@/lib/db/connect'
import QRCode from '@/lib/db/models/QRCode'
import mongoose from 'mongoose'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session) return null
  const user = session.user as { role?: string }
  if (user.role !== 'admin') return null
  return session
}

// GET /api/admin/relatorios?mes=2024-05
export async function GET(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const mes = req.nextUrl.searchParams.get('mes') // ex: "2026-04"
  await connectDB()

  let dateFilter = {}
  if (mes) {
    const [year, month] = mes.split('-').map(Number)
    const start = new Date(year, month - 1, 1)
    const end = new Date(year, month, 1)
    dateFilter = { createdAt: { $gte: start, $lt: end } }
  }

  // Agrupa por usuário
  const porUsuario = await QRCode.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: '$userId',
        total: { $sum: 1 },
        pagos: { $sum: { $cond: [{ $eq: ['$status', 'pago'] }, 1, 0] } },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: '$user' },
    {
      $project: {
        userId: '$_id',
        nome: '$user.name',
        email: '$user.email',
        total: 1,
        pagos: 1,
      },
    },
    { $sort: { total: -1 } },
  ])

  // Agrupa por evento
  const porEvento = await QRCode.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: '$eventoId',
        nomeEvento: { $first: '$nomeEvento' },
        total: { $sum: 1 },
        pagos: { $sum: { $cond: [{ $eq: ['$status', 'pago'] }, 1, 0] } },
      },
    },
    { $sort: { total: -1 } },
  ])

  return NextResponse.json({ porUsuario, porEvento })
}
