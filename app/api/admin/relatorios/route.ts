import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { connectDB } from '@/lib/db/connect'
import QRCode from '@/lib/db/models/QRCode'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session) return null
  if ((session.user as { role?: string }).role !== 'admin') return null
  return session
}

export async function GET(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const mes = req.nextUrl.searchParams.get('mes')
  await connectDB()

  let dateFilter = {}
  if (mes) {
    const [year, month] = mes.split('-').map(Number)
    dateFilter = { createdAt: { $gte: new Date(year, month - 1, 1), $lt: new Date(year, month, 1) } }
  }

  // Por usuário — detalhado por evento
  const porUsuario = await QRCode.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: { userId: '$userId', eventoId: '$eventoId', nomeEvento: '$nomeEvento' },
        total: { $sum: 1 },
        pagos: { $sum: { $cond: [{ $eq: ['$status', 'pago'] }, 1, 0] } },
        pendentes: { $sum: { $cond: [{ $eq: ['$status', 'pendente'] }, 1, 0] } },
        ultimoGerado: { $max: '$createdAt' },
      }
    },
    {
      $lookup: { from: 'users', localField: '_id.userId', foreignField: '_id', as: 'user' }
    },
    { $unwind: '$user' },
    {
      $group: {
        _id: '$_id.userId',
        nome: { $first: '$user.name' },
        email: { $first: '$user.email' },
        totalGeral: { $sum: '$total' },
        pagosGeral: { $sum: '$pagos' },
        eventos: {
          $push: {
            eventoId: '$_id.eventoId',
            nomeEvento: '$_id.nomeEvento',
            total: '$total',
            pagos: '$pagos',
            pendentes: '$pendentes',
            ultimoGerado: '$ultimoGerado',
          }
        }
      }
    },
    { $sort: { totalGeral: -1 } },
  ])

  // Resumo por evento (todos os usuários)
  const porEvento = await QRCode.aggregate([
    { $match: dateFilter },
    {
      $group: {
        _id: { eventoId: '$eventoId', nomeEvento: '$nomeEvento' },
        total: { $sum: 1 },
        pagos: { $sum: { $cond: [{ $eq: ['$status', 'pago'] }, 1, 0] } },
        usuarios: { $addToSet: '$userId' },
      }
    },
    {
      $project: {
        nomeEvento: '$_id.nomeEvento',
        total: 1, pagos: 1,
        numUsuarios: { $size: '$usuarios' },
      }
    },
    { $sort: { total: -1 } },
  ])

  return NextResponse.json({ porUsuario, porEvento })
}
