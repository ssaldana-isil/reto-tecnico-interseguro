import Joi from 'joi';

/** JSON plano que envían las aplicaciones cliente. */
export interface EndorseRequestDto {
  policyNumber: string;
  producto: string;
  tipoEndoso: string;
  idEnvio?: number;
  frecuencia?: string;
  plan?: string;
  moneda?: string;
  usuario?: string;
  fechaSolicitud?: string;
  fechaCliente?: string;
  fechaEfectiva?: string;
  /** Cualquier otra clave que una plantilla referencie en campo_entrada. */
  [campo: string]: unknown;
}

/**
 * Solo policyNumber, producto y tipoEndoso son obligatorios a nivel de esquema.
 * Se aceptan claves adicionales: una plantilla nueva puede leer campos que hoy no existen.
 */
export const endorseRequestSchema = Joi.object<EndorseRequestDto>({
  policyNumber: Joi.string().required(),
  producto: Joi.string().required(),
  tipoEndoso: Joi.string().required(),
  idEnvio: Joi.number(),
  frecuencia: Joi.string(),
  plan: Joi.string(),
  moneda: Joi.string(),
  usuario: Joi.string(),
  fechaSolicitud: Joi.string(),
  fechaCliente: Joi.string(),
  fechaEfectiva: Joi.string(),
}).unknown(true);
