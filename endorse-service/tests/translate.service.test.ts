import { rumboCambioFrecuencia } from '../src/database/seed-data';
import { TemplateNotFoundError } from '../src/entities/errors';
import type { PlantillaRepository } from '../src/repositories/plantilla.repository';
import { TranslateService } from '../src/services/translate.service';
import { pdfInput, pdfOutput, plantillaFromSeed } from './fixtures';

const repoWith = (found: ReturnType<typeof plantillaFromSeed> | null): PlantillaRepository => ({
  findActive: jest.fn().mockResolvedValue(found),
});

describe('TranslateService', () => {
  it('busca la plantilla por (producto, tipoEndoso) y devuelve el JSON del core', async () => {
    const repo = repoWith(plantillaFromSeed(rumboCambioFrecuencia));

    const out = await new TranslateService(repo).translate(pdfInput);

    expect(repo.findActive).toHaveBeenCalledWith('Rumbo', 'CambioFrecuencia');
    expect(out).toStrictEqual(pdfOutput);
  });

  it('lanza TemplateNotFoundError con el par consultado si no hay plantilla activa', async () => {
    const service = new TranslateService(repoWith(null));

    await expect(service.translate({ ...pdfInput, producto: 'Otro' })).rejects.toMatchObject({
      constructor: TemplateNotFoundError,
      producto: 'Otro',
      tipoEndoso: 'CambioFrecuencia',
    });
  });
});
