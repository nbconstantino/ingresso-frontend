import { NextRequest, NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/connect'
import User from '@/lib/db/models/User'
import { hashPassword } from '@/lib/auth/password'

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json()

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Senha deve ter no mínimo 6 caracteres' }, { status: 400 })
    }

    await connectDB()

    const existing = await User.findOne({ email: email.toLowerCase() })
    if (existing) {
      return NextResponse.json({ error: 'Email já cadastrado' }, { status: 409 })
    }

    // Primeiro usuário cadastrado vira admin automaticamente
    const count = await User.countDocuments()
    const role = count === 0 ? 'admin' : 'user'

    const passwordHash = await hashPassword(password)
    await User.create({ name, email: email.toLowerCase(), passwordHash, role })

    return NextResponse.json({ ok: true, role })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
