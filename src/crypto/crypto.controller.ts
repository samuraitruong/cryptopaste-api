import { ApiCallback, ApiContext, ApiEvent, ApiHandler } from '../../shared/api.interfaces';
import { ConfigurationErrorResult, ErrorResult, ForbiddenResult, NotFoundResult } from '../../shared/errors';
import { ResponseBuilder } from '../../shared/response-builder';
import { CreateCryptoTicketResult, CreateCryptoTicketRequest } from './crypto.interfaces';
import { CryptoService } from './crypto.service';

export class CryptoController {
  public constructor(private _service: CryptoService) {
  }

  public createCryptoJson: ApiHandler = async (event: ApiEvent, context: ApiContext, callback: ApiCallback): Promise<void> => {
      const model : CreateCryptoTicketRequest = JSON.parse(<string>event.body);

      try{
        const result = await this._service.createCryptoTicket(model);
        return ResponseBuilder.ok<CreateCryptoTicketResult>(result, callback);
      }
      catch(error) {
            if (error instanceof NotFoundResult) {
                return ResponseBuilder.notFound(error.code, error.description, callback);
            }

            if (error instanceof ForbiddenResult) {
                return ResponseBuilder.forbidden(error.code, error.description, callback);
            }

            if (error instanceof ConfigurationErrorResult) {
                return ResponseBuilder.configurationError(error.code, error.description, callback);
            }

            return ResponseBuilder.internalServerError(error, callback);
      }
  }
}
