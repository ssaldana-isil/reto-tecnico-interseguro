import type { PlantillaSeed } from '../src/database/seed-data';
import { PlantillaModel } from '../src/models';

/** "Datos de entrada" del ejemplo del reto (PDF, Ejercicio 1). */
export const pdfInput = {
  policyNumber: '08200000049',
  idEnvio: 5984,
  frecuencia: 'Semestral',
  tipoEndoso: 'CambioFrecuencia',
  producto: 'Rumbo',
  plan: 'PlanRumbo',
  moneda: 'Nuevo Sol',
  usuario: 'interface.servicios',
  fechaSolicitud: '2025-08-27',
  fechaCliente: '2025-08-27',
  fechaEfectiva: '2025-09-01',
};

/** "Datos de salida (usando la configuración en BD)" del ejemplo del reto, en el mismo orden de claves. */
export const pdfOutput = {
  policyNumber: '08200000049',
  idEnvio: 5984,
  financialPlansEntity: {
    description: 'Semestral',
  },
  currency: {
    description: 'Nuevo Sol',
  },
  productEntity: {
    description: 'Rumbo',
  },
  eventEntity: {
    description: 'SolicitarEndoso',
    dynamicData: [
      { etiqueta: 'ProductosVida', value: 'Rumbo' },
      { etiqueta: 'NombreUsuario', value: 'interface.servicios' },
      { etiqueta: 'NumeroPolizaEndoso', value: '08200000049' },
      { etiqueta: 'TipoEndosoPol', value: 'Endoso Simple' },
      { etiqueta: 'ResponsableAtencion', value: 'SAC' },
      { etiqueta: 'EndosoModifPrima', value: 'Si' },
      { etiqueta: 'InicioVigenciaEndoso', value: 'Default' },
      { etiqueta: 'TipoVigenciaEndoso', value: '' },
      { etiqueta: 'EndososSimplesSACRumbo', value: 'TES008' },
      { etiqueta: 'FechaSolicitud', value: '2025-08-27' },
      { etiqueta: 'FechaCliente', value: '2025-08-27' },
      { etiqueta: 'FechaEfectiva', value: '2025-09-01' },
    ],
  },
  eventAppliedEntities: [
    { description: 'SolicitarEndoso', orderEvent: 1 },
    { description: 'AprobarEndoso', orderEvent: 2 },
  ],
  riskUnitEntities: [
    {
      insuranceObjectEntities: [
        {
          insuranceObjectNumber: '1',
          coverageEntities: [],
          participationEntities: [],
        },
      ],
      plansEntity: {
        description: 'PlanRumbo',
      },
      riskUnitNumber: '1',
    },
  ],
  participationEntities: [],
};

/** Construye en memoria (sin BD) el mismo PlantillaModel que carga el seed. */
export function plantillaFromSeed(seed: PlantillaSeed): PlantillaModel {
  return Object.assign(new PlantillaModel(), {
    id: 1,
    eventDescription: seed.eventDescription,
    version: seed.version,
    activo: seed.activo,
    campos: seed.campos.map((campo, index) => ({
      id: index + 1,
      orden: index + 1,
      etiqueta: campo.etiqueta,
      origen: campo.origen,
      campoEntrada: campo.campoEntrada ?? null,
      valorDefault: campo.valorDefault ?? null,
      requerido: campo.requerido,
    })),
    eventos: seed.eventos.map((evento, index) => ({ id: index + 1, ...evento })),
    riskUnits: seed.riskUnits.map((riskUnit, index) => ({ id: index + 1, ...riskUnit })),
  });
}
