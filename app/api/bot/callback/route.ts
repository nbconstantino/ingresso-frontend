import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/connect'
import QRCode from '@/lib/db/models/QRCode'
import Evento from '@/lib/db/models/Evento'

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
      const docs = qrcodes.map((q: {
        contaId: string; nomeConta: string; nomeEvento: string
        imagemBase64: string; pixCopiaCola: string; erro?: string
        qrGeradoEm?: number  // timestamp ms do momento exato da geração
      }) => {
        // Usa o timestamp exato do bot; fallback para agora
        const geradoEm = q.qrGeradoEm ? new Date(q.qrGeradoEm) : new Date()
        const expiresAt = new Date(geradoEm.getTime() + 5 * 60 * 1000) // +5min exatos
        return {
          eventoId: eventoMongoId,
          contaId: q.contaId,
          userId,
          nomeEvento: q.nomeEvento,
          nomeConta: q.nomeConta,
          imagemBase64: q.imagemBase64 ?? '',
          pixCopiaCola: q.pixCopiaCola ?? '',
          status: q.erro ? 'pendente' : 'pendente',
          qrGeradoEm: geradoEm,
          expiresAt,
          erro: q.erro,
        }
      })

      await QRCode.insertMany(docs)
      await Evento.updateOne({ _id: eventoMongoId }, { status: 'finalizado' })
      return NextResponse.json({ ok: true })
    }

    if (type === 'erro') {
      await Evento.updateOne({ _id: eventoMongoId }, { status: 'erro' })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'type inválido' }, { status: 400 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
