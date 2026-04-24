import mongoose, { Schema, Document, Model, Types } from 'mongoose'

export interface IQRCode extends Document {
  userId: Types.ObjectId
  eventoId: string
  contaId: string
  nomeEvento: string
  nomeConta: string
  imagemBase64: string
  pixCopiaCola: string
  status: 'pendente' | 'pago' | 'expirado'
  qrGeradoEm: Date   // momento exato em que o QR foi gerado no gateway
  expiresAt: Date    // qrGeradoEm + 5 minutos
  erro?: string
  createdAt: Date
}

const QRCodeSchema = new Schema<IQRCode>({
  userId:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
  eventoId:     { type: String, required: true },
  contaId:      { type: String, required: true },
  nomeEvento:   { type: String, required: true },
  nomeConta:    { type: String, required: true },
  imagemBase64: { type: String, default: '' },
  pixCopiaCola: { type: String, default: '' },
  status:       { type: String, enum: ['pendente', 'pago', 'expirado'], default: 'pendente' },
  qrGeradoEm:   { type: Date, default: Date.now },
  expiresAt:    { type: Date },
  erro:         { type: String },
}, { timestamps: true })

const QRCode: Model<IQRCode> =
  mongoose.models.QRCode ?? mongoose.model<IQRCode>('QRCode', QRCodeSchema)

export default QRCode
