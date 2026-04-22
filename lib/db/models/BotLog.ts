import mongoose, { Schema, Document, Model, Types } from 'mongoose'

export interface IBotLog extends Document {
  eventoId: Types.ObjectId
  userId: Types.ObjectId
  nivel: 'INFO' | 'SUCESSO' | 'AVISO' | 'ERRO' | 'DEBUG'
  msg: string
  ts: Date
}

const BotLogSchema = new Schema<IBotLog>({
  eventoId: { type: Schema.Types.ObjectId, ref: 'Evento', required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  nivel: { type: String, enum: ['INFO', 'SUCESSO', 'AVISO', 'ERRO', 'DEBUG'], required: true },
  msg: { type: String, required: true },
  ts: { type: Date, default: Date.now },
})

const BotLog: Model<IBotLog> =
  mongoose.models.BotLog ?? mongoose.model<IBotLog>('BotLog', BotLogSchema)

export default BotLog
