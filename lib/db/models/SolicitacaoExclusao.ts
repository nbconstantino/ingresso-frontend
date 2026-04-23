import mongoose, { Schema, Document, Model, Types } from 'mongoose'

export interface ISolicitacaoExclusao extends Document {
  eventoId: Types.ObjectId
  userId: Types.ObjectId
  nomeEvento: string
  motivo: string
  status: 'pendente' | 'aprovada' | 'rejeitada'
  createdAt: Date
}

const SolicitacaoExclusaoSchema = new Schema<ISolicitacaoExclusao>({
  eventoId:   { type: Schema.Types.ObjectId, ref: 'Evento', required: true },
  userId:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
  nomeEvento: { type: String, required: true },
  motivo:     { type: String, default: '' },
  status:     { type: String, enum: ['pendente', 'aprovada', 'rejeitada'], default: 'pendente' },
}, { timestamps: true })

const SolicitacaoExclusao: Model<ISolicitacaoExclusao> =
  mongoose.models.SolicitacaoExclusao ?? mongoose.model<ISolicitacaoExclusao>('SolicitacaoExclusao', SolicitacaoExclusaoSchema)

export default SolicitacaoExclusao
