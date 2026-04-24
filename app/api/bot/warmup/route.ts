import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const botUrl = process.env.BOT_SERVER_URL
  if (!botUrl) return NextResponse.json({ error: 'BOT_SERVER_URL não configurado' }, { status: 500 })

  const start = Date.now()
  try {
    const res = await fetch(`${botUrl.replace(/\/+$/, '')}/health`, {
      signal: AbortSignal.timeout(15000),
    })
    const ms = Date.now() - start
    const ok = res.ok
    return NextResponse.json({ ok, ms, status: res.status })
  } catch (err) {
    const ms = Date.now() - start
    return NextResponse.json({ ok: false, ms, erro: String(err) })
  }
}
