import { NextResponse } from 'next/server'
import { connectDB } from '@/lib/db/connect'
import User from '@/lib/db/models/User'

export async function GET() {
  await connectDB()
  const count = await User.countDocuments()
  return NextResponse.json({ isFirst: count === 0 })
}
