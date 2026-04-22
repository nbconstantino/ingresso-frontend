import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IConvite extends Document {
  codigo: string
  criadoPor: mongoose.Types.ObjectId
  usadoPor?: mongoose.Types.ObjectId
  usado: boolean
  expiresAt: Date
  createdAt: Date
}

const ConviteSchema = new Schema<IConvite>({
  codigo:    { type: String, required: true, unique: true },
  criadoPor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  usadoPor:  { type: Schema.Types.ObjectId, ref: 'User' },
  usado:     { type: Boolean, default: false },
  expiresAt: { type: Date, required: true },
}, { timestamps: true })

const Convite: Model<IConvite> =
  mongoose.models.Convite ?? mongoose.model<IConvite>('Convite', ConviteSchema)

export default Convite
