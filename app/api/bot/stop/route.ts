import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { connectDB } from '@/lib/db/connect'
import Evento from '@/lib/db/models/Evento'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { eventoId } = await req.json()
  if (!eventoId) return NextResponse.json({ error: 'eventoId obrigatório' }, { status: 400 })

  await connectDB()
  const userId = (session.user as { id: string }).id

  // Tenta avisar o bot para parar (best-effort)
  const botUrl = process.env.BOT_SERVER_URL
  const botSecret = process.env.BOT_SECRET
  if (botUrl) {
    fetch(`${botUrl}/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-bot-secret': botSecret ?? '' },
      body: JSON.stringify({ eventoId }),
      signal: AbortSignal.timeout(5000),
    }).catch(() => {})
  }

  // Reseta o status para aguardando
  await Evento.updateOne({ _id: eventoId, userId }, { status: 'aguardando' })
  return NextResponse.json({ ok: true })
}
