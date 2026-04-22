import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'
import { connectDB } from '@/lib/db/connect'
import User from '@/lib/db/models/User'
import Convite from '@/lib/db/models/Convite'
import { hashPassword } from '@/lib/auth/password'

export async function POST(req: NextRequest) {
  try {
    await connectDB()
    const count = await User.countDocuments()

    const { name, email, password, codigo } = await req.json()
    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'Senha deve ter no mínimo 6 caracteres' }, { status: 400 })
    }

    // Primeiro usuário = admin, sem necessidade de código
    if (count > 0) {
      if (!codigo) {
        return NextResponse.json({ error: 'Código de convite obrigatório' }, { status: 403 })
      }
      const convite = await Convite.findOne({
        codigo: codigo.toUpperCase().trim(),
        usado: false,
        expiresAt: { $gt: new Date() },
      })
      if (!convite) {
        return NextResponse.json({ error: 'Código inválido ou expirado' }, { status: 403 })
      }

      const existing = await User.findOne({ email: email.toLowerCase() })
      if (existing) return NextResponse.json({ error: 'Email já cadastrado' }, { status: 409 })

      const passwordHash = await hashPassword(password)
      const user = await User.create({ name, email: email.toLowerCase(), passwordHash, role: 'user' })

      // Marca convite como usado
      await Convite.updateOne({ _id: convite._id }, { usado: true, usadoPor: user._id })

      return NextResponse.json({ ok: true, role: 'user' })
    }

    // Primeiro usuário — admin
    const existing = await User.findOne({ email: email.toLowerCase() })
    if (existing) return NextResponse.json({ error: 'Email já cadastrado' }, { status: 409 })

    const passwordHash = await hashPassword(password)
    await User.create({ name, email: email.toLowerCase(), passwordHash, role: 'admin' })
    return NextResponse.json({ ok: true, role: 'admin' })

  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
