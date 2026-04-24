'use client'
import { useState } from 'react'
import Navbar from '@/components/Navbar'

const GUIA = [
  {
    id: 'contas',
    icone: '👤',
    titulo: 'Cadastrar Contas',
    desc: 'Adicione suas contas do Ingresso Nacional',
    passos: [
      'Vá em Contas → Nova Conta',
      'Preencha com os dados exatos do seu cadastro no site ingressonacional.com.br',
      'O CEP preenche o endereço automaticamente',
      'Salve — a senha é criptografada e nunca fica visível',
    ],
    dica: 'Cada conta compra 1 ingresso. Para 3 ingressos, cadastre 3 contas.',
  },
  {
    id: 'evento',
    icone: '🎟️',
    titulo: 'Configurar Evento',
    desc: 'Defina qual evento e quais contas vão comprar',
    passos: [
      'Vá em Eventos → Novo Evento',
      'Cole a URL completa do evento (ex: ingressonacional.com.br/evento/33724/...)',
      'O nome é detectado automaticamente',
      'Selecione as contas que vão comprar e o tipo de ingresso (entrada ou geral)',
      'Opcionalmente, defina data/hora de liberação para o bot começar automaticamente',
    ],
    dica: 'Se você não sabe o tipo, escolha "Geral" — geralmente é o ingresso mais caro.',
  },
  {
    id: 'bot',
    icone: '🤖',
    titulo: 'Iniciar o Bot',
    desc: 'Deixe o bot comprar automaticamente',
    passos: [
      'Clique em ⚡ na navbar para acordar o servidor (evita atraso na primeira compra)',
      'Na página de Eventos, clique em ▶ Iniciar no evento desejado',
      'O bot monitora os ingressos a cada 5 segundos',
      'Quando encontrar, realiza a compra automaticamente',
      'Você pode acompanhar o progresso em tempo real',
    ],
    dica: 'Recomendado: acorde o servidor (⚡) alguns minutos antes da liberação.',
  },
  {
    id: 'qrcode',
    icone: '📱',
    titulo: 'QR Code Pix',
    desc: 'Pague o ingresso em até 5 minutos',
    passos: [
      'Após a compra, vá em QR Codes',
      'O QR Code aparece com um timer de 5 minutos para pagamento',
      'Clique no QR para ampliar e ver os detalhes',
      'Copie o código Pix ou escaneie com seu banco',
      'Após pagar, marque como "Pago" para controle',
    ],
    dica: '⚠️ Você tem exatamente 5 minutos para pagar — tenha o app do banco aberto.',
  },
  {
    id: 'multiplas',
    icone: '👥',
    titulo: 'Múltiplas Contas',
    desc: 'Compre vários ingressos de uma vez',
    passos: [
      'Cadastre uma conta por ingresso desejado',
      'No evento, selecione todas as contas',
      'O bot compra em paralelo — todas ao mesmo tempo',
      'Cada conta gera seu próprio QR Code',
    ],
    dica: 'O bot compra todas as contas simultaneamente, maximizando as chances.',
  },
]

const FAQ = [
  { p: 'O bot garante que vou conseguir o ingresso?', r: 'O bot age muito mais rápido que um humano, mas não garante — depende da disponibilidade do evento.' },
  { p: 'O QR Code expirou antes de eu pagar. E agora?', r: 'O ingresso foi reservado mas o pedido expirou. Tente iniciar o bot novamente para um novo pedido.' },
  { p: 'Posso usar a mesma conta em vários eventos?', r: 'Sim, mas não simultaneamente. Uma conta compra um ingresso por vez.' },
  { p: 'O que é "Ingresso Entrada" vs "Geral"?', r: '"Entrada" geralmente tem horário limite (ex: até as 22h) e é mais barato. "Geral" não tem restrição de horário.' },
  { p: 'Por que o bot demorou para iniciar?', r: 'O servidor fica em espera após 15min inativo. Use o botão ⚡ para acordá-lo antes de precisar.' },
]

export default function AjudaPage() {
  const [aberto, setAberto] = useState<string | null>('contas')
  const [faqAberto, setFaqAberto] = useState<number | null>(null)

  return (
    <div className="min-h-screen t-bg">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold t-text">📖 Como usar o IngressoBot</h1>
          <p className="t-text2 text-sm mt-2">Guia completo passo a passo para comprar ingressos automaticamente.</p>
        </div>

        {/* Guia por etapas */}
        <div className="space-y-3 mb-10">
          {GUIA.map((item, idx) => (
            <div key={item.id} className="t-card border rounded-xl overflow-hidden">
              <button onClick={() => setAberto(aberto === item.id ? null : item.id)}
                className="w-full flex items-center gap-4 px-5 py-4 text-left t-hover transition-colors">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-xl shrink-0">
                  {item.icone}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs t-text3 font-medium">Passo {idx + 1}</span>
                    {aberto !== item.id && <span className="text-xs t-text3">· {item.desc}</span>}
                  </div>
                  <div className="t-text font-semibold">{item.titulo}</div>
                </div>
                <span className="t-text3 text-lg">{aberto === item.id ? '▲' : '▼'}</span>
              </button>

              {aberto === item.id && (
                <div className="px-5 pb-5 border-t t-border animate-fade">
                  <ol className="mt-4 space-y-2.5">
                    {item.passos.map((passo, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">
                          {i + 1}
                        </span>
                        <span className="t-text text-sm">{passo}</span>
                      </li>
                    ))}
                  </ol>
                  {item.dica && (
                    <div className="mt-4 bg-blue-500/10 border border-blue-500/30 rounded-lg px-4 py-3">
                      <p className="text-blue-400 text-xs"><strong>💡 Dica:</strong> {item.dica}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div>
          <h2 className="text-lg font-bold t-text mb-4">❓ Perguntas frequentes</h2>
          <div className="space-y-2">
            {FAQ.map((item, i) => (
              <div key={i} className="t-card border rounded-xl overflow-hidden">
                <button onClick={() => setFaqAberto(faqAberto === i ? null : i)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left t-hover transition-colors">
                  <span className="t-text text-sm font-medium">{item.p}</span>
                  <span className="t-text3 ml-3 shrink-0">{faqAberto === i ? '▲' : '▼'}</span>
                </button>
                {faqAberto === i && (
                  <div className="px-5 pb-4 border-t t-border animate-fade">
                    <p className="t-text2 text-sm mt-3">{item.r}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
