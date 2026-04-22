import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { connectDB } from '@/lib/db/connect'
import Evento from '@/lib/db/models/Evento'
import Conta from '@/lib/db/models/Conta'
import { decrypt } from '@/lib/auth/crypto'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  try {
    const { eventoId } = await req.json()
    if (!eventoId) return NextResponse.json({ error: 'eventoId obrigatório' }, { status: 400 })

    await connectDB()
    const userId = (session.user as { id: string }).id

    const evento = await Evento.findOne({ _id: eventoId, userId })
    if (!evento) return NextResponse.json({ error: 'Evento não encontrado' }, { status: 404 })

    // Busca dados de todas as contas selecionadas e descriptografa as senhas em RAM
    const contasIds = evento.contasSelecionadas.map((c) => c.contaId)
    const contas = await Conta.find({ _id: { $in: contasIds }, ativa: true })

    const contasPayload = evento.contasSelecionadas.map((sel) => {
      const conta = contas.find((c) => c._id.toString() === sel.contaId.toString())
      if (!conta) return null
      return {
        contaId: conta._id.toString(),
        nome: conta.nome,
        email: conta.email,
        senha: decrypt(conta.senhaEncriptada),       // descriptografado só aqui
        cpf: decrypt(conta.cpfEncriptado),
        telefone: conta.telefone,
        cep: conta.cep,
        endereco: conta.endereco,
        numero: conta.numero,
        complemento: conta.complemento,
        bairro: conta.bairro,
        uf: conta.uf,
        cidadeId: conta.cidadeId,
        nomeCidade: conta.nomeCidade,
        nascimento: conta.nascimento,
        sexo: conta.sexo,
        tipoIngresso: sel.tipoIngresso,
      }
    }).filter(Boolean)

    if (contasPayload.length === 0) {
      return NextResponse.json({ error: 'Nenhuma conta válida selecionada' }, { status: 400 })
    }

    // Monta payload para o bot no Render
    const botPayload = {
      eventoMongoId: evento._id.toString(),
      eventoId: evento.eventoId,
      eventoUrl: evento.url,
      eventoNome: evento.nome,
      userId,
      dataLiberacao: evento.dataLiberacao?.toISOString() ?? null,
      contas: contasPayload,
    }

    const botUrl = process.env.BOT_SERVER_URL
    const botSecret = process.env.BOT_SECRET

    if (!botUrl) {
      return NextResponse.json({ error: 'BOT_SERVER_URL não configurada' }, { status: 500 })
    }

    // Atualiza status para "comprando"
    await Evento.updateOne({ _id: eventoId }, { status: 'comprando' })

    // Dispara o bot (fire-and-forget com timeout curto só para verificar se está online)
    const response = await fetch(`${botUrl}/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-bot-secret': botSecret ?? '',
      },
      body: JSON.stringify(botPayload),
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      await Evento.updateOne({ _id: eventoId }, { status: 'aguardando' })
      return NextResponse.json({ error: 'Bot não respondeu' }, { status: 502 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Erro ao iniciar bot' }, { status: 500 })
  }
}
