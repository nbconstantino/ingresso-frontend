import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'

// GET /api/evento-info?url=https://...
// Busca o nome do evento e lista de cidades para auto-preencher
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const url = req.nextUrl.searchParams.get('url')
  const uf = req.nextUrl.searchParams.get('uf') // para buscar cidades

  // Busca cidades de um estado
  if (uf) {
    try {
      const res = await fetch('https://www.ingressonacional.com.br/api/paginas/cidades.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Referer': 'https://www.ingressonacional.com.br/',
          'User-Agent': 'Mozilla/5.0',
          'Origin': 'https://www.ingressonacional.com.br',
        },
        body: JSON.stringify({ estado: uf }),
      })
      const data = await res.json()
      return NextResponse.json({ cidades: Array.isArray(data) ? data : [] })
    } catch {
      return NextResponse.json({ cidades: [] })
    }
  }

  // Busca nome do evento pela URL
  if (!url) return NextResponse.json({ error: 'url ou uf obrigatório' }, { status: 400 })

  const match = url.match(/\/evento\/(\d+)/)
  if (!match) return NextResponse.json({ error: 'URL inválida' }, { status: 400 })

  const eventoId = match[1]

  try {
    const res = await fetch('https://www.ingressonacional.com.br/api/paginas/evento.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Referer': 'https://www.ingressonacional.com.br/',
        'User-Agent': 'Mozilla/5.0',
        'Origin': 'https://www.ingressonacional.com.br',
      },
      body: JSON.stringify({ evento: eventoId }),
    })
    const data = await res.json()
    const nome = data?.sucesso?.evento?.Nome ?? null
    return NextResponse.json({ nome, eventoId })
  } catch {
    // Fallback: extrai da URL (ex: /evento/33724/syon-trio-by-douha → "Syon Trio by Douha")
    const slug = url.split('/').pop() ?? ''
    const nomeFromSlug = slug
      .split('-')
      .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
    return NextResponse.json({ nome: nomeFromSlug, eventoId })
  }
}
