import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/authOptions'

function nomeFromSlug(url: string): string {
  // Pega o slug: /evento/33724/syon-trio-by-douha → "syon-trio-by-douha"
  const parts = url.split('/')
  const slug = parts[parts.length - 1] ?? ''
  // Converte para título: "syon-trio-by-douha" → "Syon Trio by Douha"
  return slug
    .split('-')
    .map((w, i) => {
      // Palavras conectivas em minúsculo (exceto a primeira)
      const lower = ['by', 'at', 'de', 'do', 'da', 'no', 'na', 'e', 'em']
      if (i > 0 && lower.includes(w.toLowerCase())) return w.toLowerCase()
      return w.charAt(0).toUpperCase() + w.slice(1)
    })
    .join(' ')
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const url = req.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'url obrigatória' }, { status: 400 })

  const match = url.match(/\/evento\/(\d+)\/([^/?]+)/)
  if (!match) return NextResponse.json({ error: 'URL inválida' }, { status: 400 })

  const eventoId = match[1]
  const slugNome = nomeFromSlug(url)

  // Tenta buscar o nome real na API do site
  try {
    const res = await fetch('https://www.ingressonacional.com.br/api/paginas/evento.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Referer': 'https://www.ingressonacional.com.br/',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Origin': 'https://www.ingressonacional.com.br',
      },
      body: JSON.stringify({ evento: eventoId }),
      signal: AbortSignal.timeout(5000),
    })

    if (res.ok) {
      const data = await res.json()
      const nomeAPI = data?.sucesso?.evento?.Nome
      if (nomeAPI && nomeAPI.length > 2) {
        return NextResponse.json({ nome: nomeAPI, eventoId })
      }
    }
  } catch { /* usa fallback */ }

  // Fallback: nome do slug
  return NextResponse.json({ nome: slugNome, eventoId })
}
