'use client'
import './globals.css'
import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from '@/components/ThemeProvider'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <head>
        <title>IngressoBot</title>
        <meta name="description" content="Automacao de compra de ingressos" />
        <script dangerouslySetInnerHTML={{
          __html: `try{const t=localStorage.getItem('theme')||'dark';document.documentElement.className=t==='light'?'light':'dark'}catch(e){}`
        }} />
      </head>
      <body>
        <SessionProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
