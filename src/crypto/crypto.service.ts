import { AWSError } from 'aws-sdk';
import { generate } from 'shortid'
import { ErrorCode } from '../../shared/error-codes';
import { ConfigurationErrorResult, ForbiddenResult, InternalServerErrorResult, NotFoundResult } from '../../shared/errors';
import { CreateCryptoTicketResult, CreateCryptoTicketRequest, GetCryptoTicketResponse, DecryptCryptoTicketRequest } from './crypto.interfaces';
import { CryptoRepository } from './crypto.repository';
import { Encryption } from '../services/encryption'
import { Util } from '../services/util'

export class CryptoService {
  public constructor(private _repo: CryptoRepository,
    private _encryption : Encryption, 
    private _env: NodeJS.ProcessEnv) {
  }

  public async createCryptoTicket(ticket: CreateCryptoTicketRequest): Promise<CreateCryptoTicketResult> {
    // generate and encrypt
    ticket.id  = generate();
    
    const encryptResponse = this._encryption.encrypt(ticket.text, ticket.password);
    delete ticket.password;
    const ts = Util.unix()
    ticket.expires += ts + ticket.expires
    ticket.iv = encryptResponse.iv;
    ticket.tag = encryptResponse.tag;
    ticket.text = encryptResponse.content;
    try{
        await this._repo.createTicket(ticket);
        return {id: ticket.id, expires: ticket.expires};
    }
    catch(error) {
      console.log(error)
        if (error.code === 'AccessDeniedException') {
          throw new ForbiddenResult(ErrorCode.MissingPermission, error.message);
        }

        if (error instanceof NotFoundResult) {
          throw error;
        }

        throw new InternalServerErrorResult(error.name, error.message);
    }
    
  }

  public async getCryptoTicket(ticketId: string): Promise<GetCryptoTicketResponse> {
    // generate and encrypt
    try{
        const ticket = await this._repo.getTicket(ticketId);
        return {
          id: ticket.id, 
          text: ticket.text,
          expires: ticket.expires,
          expired: false,
          created: ticket.created
        };
    }
    catch(error) {
      console.log(error)
        if (error.code === 'AccessDeniedException') {
          throw new ForbiddenResult(ErrorCode.MissingPermission, error.message);
        }

        if (error instanceof NotFoundResult) {
          throw error;
        }

        throw new InternalServerErrorResult(error.name, error.message);
    }
  }

  public async decryptCryptoTicket(request: DecryptCryptoTicketRequest): Promise<GetCryptoTicketResponse> {
    // generate and encrypt
    try{
        const ticket = await this._repo.getTicket(request.id);
        const decryptContent = this._encryption.decrypt(ticket.text, request.password, ticket.iv, ticket.tag);
        if(ticket.oneTime) {
          // delete... 
        }
        return {
          id: ticket.id, 
          text: decryptContent,
          expires: ticket.expires,
          expired: ticket.oneTime,
          created: ticket.created
        };
    }
    catch(error) {
      console.log(error)
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
