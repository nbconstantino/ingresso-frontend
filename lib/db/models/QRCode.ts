import mongoose, { Schema, Document, Model, Types } from 'mongoose'

export interface IQRCode extends Document {
  eventoId: Types.ObjectId
  contaId: Types.ObjectId
  userId: Types.ObjectId
  nomeEvento: string
  nomeConta: string
  imagemBase64: string       // screenshot do QR Code em base64
  pixCopiaCola: string       // código copia-e-cola
  status: 'pendente' | 'pago'
  createdAt: Date
}

const QRCodeSchema = new Schema<IQRCode>(
  {
    eventoId: { type: Schema.Types.ObjectId, ref: 'Evento', required: true },
    contaId: { type: Schema.Types.ObjectId, ref: 'Conta', required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    nomeEvento: { type: String, required: true },
    nomeConta: { type: String, required: true },
    imagemBase64: { type: String, required: true },
    pixCopiaCola: { type: String, default: '' },
    status: { type: String, enum: ['pendente', 'pago'], default: 'pendente' },
  },
  { timestamps: true }
)

const QRCode: Model<IQRCode> =
  mongoose.models.QRCode ?? mongoose.model<IQRCode>('QRCode', QRCodeSchema)

export default QRCode
