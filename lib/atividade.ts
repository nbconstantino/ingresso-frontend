import AtividadeLog from '@/lib/db/models/AtividadeLog'

export async function registrarAtividade(
  userId: string,
  userName: string,
  acao: string,
  detalhes: string = ''
) {
  try {
    await AtividadeLog.create({ userId, userName, acao, detalhes })
  } catch {}
}
