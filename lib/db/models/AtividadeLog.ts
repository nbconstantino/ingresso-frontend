import mongoose, { Schema, Document, Model, Types } from 'mongoose'

export interface IAtividadeLog extends Document {
  userId: Types.ObjectId
  userName: string
  acao: string          // 'criar_evento', 'iniciar_bot', 'criar_conta', 'login', etc.
  detalhes: string
  createdAt: Date
}

const AtividadeLogSchema = new Schema<IAtividadeLog>({
  userId:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  acao:     { type: String, required: true },
  detalhes: { type: String, default: '' },
}, { timestamps: true })

const AtividadeLog: Model<IAtividadeLog> =
  mongoose.models.AtividadeLog ?? mongoose.model<IAtividadeLog>('AtividadeLog', AtividadeLogSchema)

export default AtividadeLog
