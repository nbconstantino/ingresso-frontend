import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/connect'
import QRCode from '@/lib/db/models/QRCode'
import Evento from '@/lib/db/models/Evento'

// Rota chamada pelo bot no Render para salvar QR Codes
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-bot-secret')
  if (secret !== process.env.BOT_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { type, eventoMongoId, userId, qrcodes, erro } = body

    await connectDB()

    if (type === 'qrcodes') {
      // Salva os QR Codes gerados pelo bot
      const docs = qrcodes.map((q: {
        contaId: string
        nomeConta: string
        nomeEvento: string
        imagemBase64: string
        pixCopiaCola: string
      }) => ({
        eventoId: eventoMongoId,
        contaId: q.contaId,
        userId,
        nomeEvento: q.nomeEvento,
        nomeConta: q.nomeConta,
        imagemBase64: q.imagemBase64,
        pixCopiaCola: q.pixCopiaCola,
        status: 'pendente',
      }))

      await QRCode.insertMany(docs)
      await Evento.updateOne({ _id: eventoMongoId }, { status: 'finalizado' })

      return NextResponse.json({ ok: true })
    }

    if (type === 'erro') {
      await Evento.updateOne({ _id: eventoMongoId }, { status: 'erro' })
      console.error(`[BOT] Erro no evento ${eventoMongoId}:`, erro)
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'type inválido' }, { status: 400 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
