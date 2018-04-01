import { AWSError } from 'aws-sdk';
import { ErrorCode } from '../../shared/error-codes';
import { ConfigurationErrorResult, ForbiddenResult, InternalServerErrorResult, NotFoundResult } from '../../shared/errors';
import { CreateCryptoTicketResult, CreateCryptoTicketRequest } from './crypto.interfaces';
import { CryptoRepository } from './crypto.repository';

export class CryptoService {
  public constructor(private _repo: CryptoRepository, private _env: NodeJS.ProcessEnv) {
  }

  public async createCryptoTicket(ticket: CreateCryptoTicketRequest): Promise<CreateCryptoTicketResult> {
    //generate and encrypt
    //adjust expired time
    //
    try{
        const result =  this._repo.createTicket(ticket)
        return result;
    }
    catch(error) {
        if (error.code === 'AccessDeniedException') {
          throw new ForbiddenResult(ErrorCode.MissingPermission, error.message);
        }

        if (error instanceof NotFoundResult) {
          throw error;
        }

        throw new InternalServerErrorResult(error.name, error.message);
    }
    
  }
}
