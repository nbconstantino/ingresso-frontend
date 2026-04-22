import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/connect'
import BotLog from '@/lib/db/models/BotLog'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-bot-secret')
  if (secret !== process.env.BOT_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const { eventoMongoId, userId, nivel, msg, ts } = await req.json()
    if (!eventoMongoId || !nivel || !msg) {
      return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 })
    }

    await connectDB()
    await BotLog.create({
      eventoId: eventoMongoId,
      userId,
      nivel,
      msg,
      ts: ts ? new Date(ts) : new Date(),
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// GET /api/bot/log?eventoId=xxx — busca logs de um evento (para polling do frontend)
export async function GET(req: NextRequest) {
  const eventoId = req.nextUrl.searchParams.get('eventoId')
  if (!eventoId) return NextResponse.json({ error: 'eventoId obrigatório' }, { status: 400 })

  await connectDB()
  const logs = await BotLog.find({ eventoId }).sort({ ts: 1 }).limit(200).lean()
  return NextResponse.json(logs)
}
