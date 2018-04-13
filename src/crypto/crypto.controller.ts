import { ApiCallback, ApiContext, ApiEvent, ApiHandler } from '../../shared/api.interfaces';
import { ConfigurationErrorResult, ErrorResult, ForbiddenResult, NotFoundResult } from '../../shared/errors';
import { ErrorCode } from '../../shared/error-codes';
import { ResponseBuilder } from '../../shared/response-builder';
import { CreateCryptoTicketResult, CreateCryptoTicketRequest, GetCryptoTicketResponse, DecryptCryptoTicketRequest , DeleteCryptoTicketRequest} from './crypto.interfaces';
import { CryptoService } from './crypto.service';
import { CryptoRepository } from './crypto.repository';

export class CryptoController {
  public constructor(private _service: CryptoService) {
  }

  public createCryptoJson: ApiHandler = async (event: ApiEvent, context: ApiContext, callback: ApiCallback): Promise<void> => {
      const model: CreateCryptoTicketRequest = JSON.parse(<string> event.body);

      try{
        const result: CreateCryptoTicketResult = await this._service.createCryptoTicket(model);
        return ResponseBuilder.ok<CreateCryptoTicketResult>(result, callback);
      }
      catch(error) {
        console.log(error)
        if (error.code == ErrorCode.MissingRecord) {
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

  public getCryptoJson: ApiHandler = async (event: ApiEvent, context: ApiContext, callback: ApiCallback): Promise<void> => {
      const ticketId : string = event.pathParameters.ticketId;

      try{
        console.log('ip address', event.requestContext.identity.sourceIp)
        const result = await this._service.getCryptoTicket(ticketId, event.requestContext.identity.sourceIp);
        if(result === undefined) {
            return ResponseBuilder.notFound(ErrorCode.MissingRecord, 'Could not find item ID: ' + ticketId , callback);
        }
        return ResponseBuilder.ok<GetCryptoTicketResponse>(result, callback);
      }
      catch(error) {
        console.log(error)
        if (error.code === ErrorCode.MissingRecord) {
            return ResponseBuilder.notFound(error.code, error.description, callback);
        }
        if (error.code === ErrorCode.MissingPermission) {
          return ResponseBuilder.forbidden(error.code, error.description, callback);
        }

        if (error instanceof ConfigurationErrorResult) {
            return ResponseBuilder.configurationError(error.code, error.description, callback);
        }

        return ResponseBuilder.internalServerError(error, callback);
      }
  }
  public deleteCryptoTicketSchedule: ApiHandler = async (event: any, context: ApiContext, callback: ApiCallback): Promise<void> => {
    try {
      const tableName :string = <string>event.TICKET_TABLE_NAME
      const service = new CryptoService(undefined, new CryptoRepository(tableName), null, null);
      await service.deleteCryptoTicketSchedule();
    } catch (error) {
      console.log(error);
    }
  }

  public decryptCryptoJson: ApiHandler = async (event: ApiEvent, context: ApiContext, callback: ApiCallback): Promise<void> => {
    const model: DecryptCryptoTicketRequest = JSON.parse(<string>event.body);

    try {
        const result = await this._service.decryptCryptoTicket(model, event.requestContext.identity.sourceIp);
        return ResponseBuilder.ok<GetCryptoTicketResponse>(result, callback);
    } catch(error) {
      console.log(error);
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
  public deleteCryptoJson: ApiHandler = async (event: ApiEvent, context: ApiContext, callback: ApiCallback): Promise<void> => {
    const model: DeleteCryptoTicketRequest = JSON.parse(<string> event.body);

    try {
        const result = await this._service.deleteCryptoTicket(model);
        return ResponseBuilder.ok<GetCryptoTicketResponse>(result, callback);
    } catch (error) {
        console.log(error);
        if (error.code === ErrorCode.MissingRecord) {
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
