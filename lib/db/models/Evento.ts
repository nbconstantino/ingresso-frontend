import mongoose, { Schema, Document, Model, Types } from 'mongoose'

export interface IContaSelecionada {
  contaId: Types.ObjectId
  tipoIngresso: 'entrada' | 'geral'   // entrada = mais barato, geral = normal
}

export interface IEvento extends Document {
  userId: Types.ObjectId
  nome: string
  url: string
  eventoId: string                     // ID extraído da URL (ex: "33724")
  dataLiberacao?: Date
  status: 'aguardando' | 'comprando' | 'finalizado' | 'erro'
  contasSelecionadas: IContaSelecionada[]
  createdAt: Date
}

const ContaSelecionadaSchema = new Schema<IContaSelecionada>(
  {
    contaId: { type: Schema.Types.ObjectId, ref: 'Conta', required: true },
    tipoIngresso: { type: String, enum: ['entrada', 'geral'], required: true },
  },
  { _id: false }
)

const EventoSchema = new Schema<IEvento>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    nome: { type: String, required: true },
    url: { type: String, required: true },
    eventoId: { type: String, required: true },
    dataLiberacao: { type: Date },
    status: {
      type: String,
      enum: ['aguardando', 'comprando', 'finalizado', 'erro'],
      default: 'aguardando',
    },
    contasSelecionadas: { type: [ContaSelecionadaSchema], default: [] },
  },
  { timestamps: true }
)

const Evento: Model<IEvento> =
  mongoose.models.Evento ?? mongoose.model<IEvento>('Evento', EventoSchema)

export default Evento
