import type { EndorseRequestDto } from '../entities/endorse-request.dto';
import type { EndorseResponseDto } from '../entities/endorse-response.dto';
import { TemplateNotFoundError } from '../entities/errors';
import { toCoreEndorsement } from '../mappers/endorse.mapper';
import type { PlantillaRepository } from '../repositories/plantilla.repository';

export class TranslateService {
  constructor(private readonly plantillas: PlantillaRepository) {}

  /** Busca la plantilla activa por (producto, tipoEndoso) y construye el JSON del core. */
  async translate(input: EndorseRequestDto): Promise<EndorseResponseDto> {
    const plantilla = await this.plantillas.findActive(input.producto, input.tipoEndoso);
    if (!plantilla) {
      throw new TemplateNotFoundError(input.producto, input.tipoEndoso);
    }
    return toCoreEndorsement(input, plantilla);
  }
}
