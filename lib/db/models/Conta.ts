import mongoose, { Schema, Document, Model, Types } from 'mongoose'

export interface IConta extends Document {
  userId: Types.ObjectId
  nome: string
  email: string
  senhaEncriptada: string   // AES-256-GCM
  cpfEncriptado: string     // AES-256-GCM
  telefone: string
  // Endereço para o checkout (obrigatório pelo site)
  cep: string
  endereco: string
  numero: string
  complemento: string
  bairro: string
  uf: string
  cidadeId: string          // ID numérico da cidade no site
  nomeCidade: string
  // Dados pessoais para o checkout
  nascimento: string        // DD/MM/AAAA
  sexo: string              // M ou F
  ativa: boolean
  createdAt: Date
}

const ContaSchema = new Schema<IConta>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    nome: { type: String, required: true },
    email: { type: String, required: true },
    senhaEncriptada: { type: String, required: true },
    cpfEncriptado: { type: String, required: true },
    telefone: { type: String, required: true },
    cep: { type: String, required: true },
    endereco: { type: String, required: true },
    numero: { type: String, required: true },
    complemento: { type: String, default: '' },
    bairro: { type: String, required: true },
    uf: { type: String, required: true },
    cidadeId: { type: String, required: true },
    nomeCidade: { type: String, required: true },
    nascimento: { type: String, required: true },
    sexo: { type: String, enum: ['M', 'F'], required: true },
    ativa: { type: Boolean, default: true },
  },
  { timestamps: true }
)

const Conta: Model<IConta> =
  mongoose.models.Conta ?? mongoose.model<IConta>('Conta', ContaSchema)

export default Conta
