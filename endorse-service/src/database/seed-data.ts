import { OrigenCampo } from '../models';

export interface CampoSeed {
  etiqueta: string;
  origen: OrigenCampo;
  campoEntrada?: string;
  valorDefault?: string;
  requerido: boolean;
}

export interface PlantillaSeed {
  producto: { codigo: string; nombre: string };
  tipoEndoso: { codigo: string; nombre: string };
  eventDescription: string;
  version: number;
  activo: boolean;
  /** El orden del array define plantilla_campo.orden (1..N). */
  campos: CampoSeed[];
  eventos: { orderEvent: number; description: string }[];
  riskUnits: { riskUnitNumber: string; insuranceObjectNumber: string; campoPlanEntrada: string }[];
}

const input = (etiqueta: string, campoEntrada: string, valorDefault?: string): CampoSeed => ({
  etiqueta,
  origen: OrigenCampo.INPUT,
  campoEntrada,
  valorDefault,
  requerido: true,
});
const byDefault = (etiqueta: string, valorDefault: string): CampoSeed => ({
  etiqueta,
  origen: OrigenCampo.DEFAULT,
  valorDefault,
  requerido: false,
});

/** Caso exacto del reto: Rumbo + CambioFrecuencia. */
export const rumboCambioFrecuencia: PlantillaSeed = {
  producto: { codigo: 'Rumbo', nombre: 'Rumbo' },
  tipoEndoso: { codigo: 'CambioFrecuencia', nombre: 'Cambio de frecuencia' },
  eventDescription: 'SolicitarEndoso',
  version: 1,
  activo: true,
  campos: [
    input('ProductosVida', 'producto'),
    input('NombreUsuario', 'usuario'),
    input('NumeroPolizaEndoso', 'policyNumber'),
    byDefault('TipoEndosoPol', 'Endoso Simple'),
    byDefault('ResponsableAtencion', 'SAC'),
    byDefault('EndosoModifPrima', 'Si'),
    byDefault('InicioVigenciaEndoso', 'Default'),
    byDefault('TipoVigenciaEndoso', ''),
    byDefault('EndososSimplesSACRumbo', 'TES008'),
    input('FechaSolicitud', 'fechaSolicitud'),
    input('FechaCliente', 'fechaCliente'),
    input('FechaEfectiva', 'fechaEfectiva'),
  ],
  eventos: [
    { orderEvent: 1, description: 'SolicitarEndoso' },
    { orderEvent: 2, description: 'AprobarEndoso' },
  ],
  riskUnits: [{ riskUnitNumber: '1', insuranceObjectNumber: '1', campoPlanEntrada: 'plan' }],
};

/**
 * Dato de ejemplo (ficticio) para demostrar extensibilidad: otro producto y tipo de endoso
 * cargados solo con INSERTs. ParentescoBeneficiario es INPUT con default "Otro".
 */
export const vidaFlexCambioBeneficiario: PlantillaSeed = {
  producto: { codigo: 'VidaFlex', nombre: 'Vida Flex' },
  tipoEndoso: { codigo: 'CambioBeneficiario', nombre: 'Cambio de beneficiario' },
  eventDescription: 'SolicitarEndoso',
  version: 1,
  activo: true,
  campos: [
    input('NumeroPolizaEndoso', 'policyNumber'),
    input('NombreUsuario', 'usuario'),
    input('NombreBeneficiario', 'beneficiario'),
    { ...input('ParentescoBeneficiario', 'parentesco', 'Otro'), requerido: false },
    input('FechaSolicitud', 'fechaSolicitud'),
  ],
  eventos: [
    { orderEvent: 1, description: 'SolicitarEndoso' },
    { orderEvent: 2, description: 'AprobarEndoso' },
  ],
  riskUnits: [{ riskUnitNumber: '1', insuranceObjectNumber: '1', campoPlanEntrada: 'plan' }],
};

export const seedPlantillas: PlantillaSeed[] = [rumboCambioFrecuencia, vidaFlexCambioBeneficiario];
