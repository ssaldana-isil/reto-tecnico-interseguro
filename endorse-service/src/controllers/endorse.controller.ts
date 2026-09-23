import type { Request, ResponseToolkit } from '@hapi/hapi';
import type { EndorseRequestDto } from '../entities/endorse-request.dto';
import { MissingFieldsError, TemplateNotFoundError } from '../entities/errors';
import type { TranslateService } from '../services/translate.service';
import { errorBody } from './error-response';

export class EndorseController {
  constructor(private readonly translateService: TranslateService) {}

  translate = async (request: Request, h: ResponseToolkit) => {
    try {
      const result = await this.translateService.translate(request.payload as EndorseRequestDto);
      return h.response(result).code(200);
    } catch (err) {
      if (err instanceof TemplateNotFoundError) {
        return h
          .response(errorBody(err.message, 'TEMPLATE_NOT_FOUND', { producto: err.producto, tipoEndoso: err.tipoEndoso }))
          .code(404);
      }
      if (err instanceof MissingFieldsError) {
        return h.response(errorBody(err.message, 'MISSING_FIELDS', { missingFields: err.missingFields })).code(422);
      }
      throw err;
    }
  };
}
