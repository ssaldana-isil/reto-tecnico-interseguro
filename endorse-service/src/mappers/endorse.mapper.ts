import type { EndorseRequestDto } from '../entities/endorse-request.dto';
import type { DynamicDataItemDto, EndorseResponseDto } from '../entities/endorse-response.dto';
import { MissingFieldsError } from '../entities/errors';
import { OrigenCampo, type PlantillaCampoModel, type PlantillaModel } from '../models';

const byOrden = (a: { orden: number }, b: { orden: number }) => a.orden - b.orden;
const byOrderEvent = (a: { orderEvent: number }, b: { orderEvent: number }) => a.orderEvent - b.orderEvent;
const byId = (a: { id: number }, b: { id: number }) => a.id - b.id;

const isPresent = (value: unknown) => value !== undefined && value !== null;

/** dynamicData siempre lleva strings (o null), como el ejemplo del core. */
function toText(value: unknown): string {
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

/** INPUT toma campo_entrada del JSON plano y, si no vino, valor_default; DEFAULT usa siempre valor_default. */
function resolveCampo(campo: PlantillaCampoModel, input: EndorseRequestDto): string | null {
  if (campo.origen === OrigenCampo.INPUT && campo.campoEntrada) {
    const raw = input[campo.campoEntrada];
    if (isPresent(raw)) {
      return toText(raw);
    }
  }
  return campo.valorDefault;
}

/**
 * Traduce el JSON plano al JSON del core según la plantilla.
 * Acumula todas las etiquetas requeridas sin valor y lanza MissingFieldsError al final.
 */
export function toCoreEndorsement(input: EndorseRequestDto, plantilla: PlantillaModel): EndorseResponseDto {
  const missing: string[] = [];
  const dynamicData: DynamicDataItemDto[] = [...plantilla.campos].sort(byOrden).map((campo) => {
    const value = resolveCampo(campo, input);
    if (value === null && campo.requerido) {
      missing.push(campo.etiqueta);
    }
    return { etiqueta: campo.etiqueta, value };
  });
  if (missing.length > 0) {
    throw new MissingFieldsError(missing);
  }

  return {
    policyNumber: input.policyNumber,
    idEnvio: input.idEnvio ?? null,
    financialPlansEntity: { description: input.frecuencia ?? null },
    currency: { description: input.moneda ?? null },
    productEntity: { description: input.producto },
    eventEntity: {
      description: plantilla.eventDescription,
      dynamicData,
    },
    eventAppliedEntities: [...plantilla.eventos]
      .sort(byOrderEvent)
      .map((evento) => ({ description: evento.description, orderEvent: evento.orderEvent })),
    riskUnitEntities: [...plantilla.riskUnits].sort(byId).map((riskUnit) => ({
      insuranceObjectEntities: [
        {
          insuranceObjectNumber: riskUnit.insuranceObjectNumber,
          coverageEntities: [],
          participationEntities: [],
        },
      ],
      plansEntity: { description: input[riskUnit.campoPlanEntrada] ?? null },
      riskUnitNumber: riskUnit.riskUnitNumber,
    })),
    participationEntities: [],
  };
}
