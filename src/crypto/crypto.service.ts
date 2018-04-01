import { AWSError } from 'aws-sdk';
import ShortId from 'shortid'
import { ErrorCode } from '../../shared/error-codes';
import { ConfigurationErrorResult, ForbiddenResult, InternalServerErrorResult, NotFoundResult } from '../../shared/errors';
import { CreateCryptoTicketResult, CreateCryptoTicketRequest } from './crypto.interfaces';
import { CryptoRepository } from './crypto.repository';

export class CryptoService {
  public constructor(private _repo: CryptoRepository, private _env: NodeJS.ProcessEnv) {
  }

  public async createCryptoTicket(ticket: CreateCryptoTicketRequest): Promise<CreateCryptoTicketResult> {
    //generate and encrypt
    ticket.id  = ShortId.generate()
    //adjust expired time
    //
    try{
        await this._repo.createTicket(ticket)
        return {id: ticket.id, expires: ticket.expires};
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
