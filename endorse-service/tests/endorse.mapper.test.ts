import { rumboCambioFrecuencia, vidaFlexCambioBeneficiario } from '../src/database/seed-data';
import { MissingFieldsError } from '../src/entities/errors';
import { toCoreEndorsement } from '../src/mappers/endorse.mapper';
import { pdfInput, pdfOutput, plantillaFromSeed } from './fixtures';

describe('toCoreEndorsement', () => {
  it('con la plantilla del PDF produce exactamente la salida del PDF (incluido el orden)', () => {
    const out = toCoreEndorsement(pdfInput, plantillaFromSeed(rumboCambioFrecuencia));

    expect(out).toStrictEqual(pdfOutput);
    // toStrictEqual ignora el orden de las claves; la serialización no.
    expect(JSON.stringify(out)).toBe(JSON.stringify(pdfOutput));
  });

  it('ordena dynamicData y eventos por su orden configurado aunque lleguen desordenados', () => {
    const plantilla = plantillaFromSeed(rumboCambioFrecuencia);
    plantilla.campos.reverse();
    plantilla.eventos.reverse();

    const out = toCoreEndorsement(pdfInput, plantilla);

    expect(out.eventEntity.dynamicData).toStrictEqual(pdfOutput.eventEntity.dynamicData);
    expect(out.eventAppliedEntities).toStrictEqual(pdfOutput.eventAppliedEntities);
  });

  it('aplica valor_default cuando el campo INPUT no llega', () => {
    const input = { policyNumber: 'P-1', producto: 'VidaFlex', tipoEndoso: 'CambioBeneficiario', usuario: 'u', beneficiario: 'Ana', fechaSolicitud: '2025-08-27' };

    const out = toCoreEndorsement(input, plantillaFromSeed(vidaFlexCambioBeneficiario));

    expect(out.eventEntity.dynamicData).toContainEqual({ etiqueta: 'ParentescoBeneficiario', value: 'Otro' });
  });

  it('usa el valor del INPUT cuando llega aunque exista default', () => {
    const input = { policyNumber: 'P-1', producto: 'VidaFlex', tipoEndoso: 'CambioBeneficiario', usuario: 'u', beneficiario: 'Ana', parentesco: 'Hija', fechaSolicitud: '2025-08-27' };

    const out = toCoreEndorsement(input, plantillaFromSeed(vidaFlexCambioBeneficiario));

    expect(out.eventEntity.dynamicData).toContainEqual({ etiqueta: 'ParentescoBeneficiario', value: 'Hija' });
  });

  it('acumula todas las etiquetas requeridas faltantes, sin cortar en la primera', () => {
    const { usuario, fechaCliente, fechaEfectiva, ...incompleto } = pdfInput;

    let error: unknown;
    try {
      toCoreEndorsement(incompleto, plantillaFromSeed(rumboCambioFrecuencia));
    } catch (err) {
      error = err;
    }

    expect(error).toBeInstanceOf(MissingFieldsError);
    expect((error as MissingFieldsError).missingFields).toStrictEqual(['NombreUsuario', 'FechaCliente', 'FechaEfectiva']);
  });

  it('convierte a string los valores de dynamicData y deja null los opcionales de la raíz', () => {
    const plantilla = plantillaFromSeed(rumboCambioFrecuencia);
    plantilla.campos[2].campoEntrada = 'idEnvio'; // NumeroPolizaEndoso ← idEnvio (número)
    const { frecuencia, moneda, plan, idEnvio, ...sinOpcionales } = pdfInput;

    const out = toCoreEndorsement({ ...sinOpcionales, idEnvio: 5984 }, plantilla);
    const sinIdEnvio = toCoreEndorsement(sinOpcionales, plantillaFromSeed(rumboCambioFrecuencia));

    expect(out.eventEntity.dynamicData[2]).toStrictEqual({ etiqueta: 'NumeroPolizaEndoso', value: '5984' });
    expect(sinIdEnvio.idEnvio).toBeNull();
    expect(sinIdEnvio.financialPlansEntity).toStrictEqual({ description: null });
    expect(sinIdEnvio.currency).toStrictEqual({ description: null });
    expect(sinIdEnvio.riskUnitEntities[0].plansEntity).toStrictEqual({ description: null });
  });
});
