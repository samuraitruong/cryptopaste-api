import { AWSError } from 'aws-sdk';
import { generate } from 'shortid'
import { ErrorCode } from '../../shared/error-codes';
import { ConfigurationErrorResult, ForbiddenResult, InternalServerErrorResult, NotFoundResult } from '../../shared/errors';
import { CreateCryptoTicketResult, CreateCryptoTicketRequest, GetCryptoTicketResponse, DecryptCryptoTicketRequest, DeleteCryptoTicketRequest } from './crypto.interfaces';
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
    ticket.expires =  Util.unix() + ticket.expires*60
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
        console.log('ticket return', ticket)
        if(!ticket) throw new NotFoundResult(ErrorCode.MissingRecord, 'Could not find the crypto ticket with ID : ' + ticketId);
        return {
          id: ticket.id, 
          text: ticket.text,
          expires: ticket.expires,
          expired: false,
          created: ticket.created,
          oneTime: ticket.oneTime
        };
    }
    catch(error) {
      console.log(error)
        if (error.code === 'AccessDeniedException') {
          throw new ForbiddenResult(ErrorCode.MissingPermission, error.message);
        }

        if (error.code == ErrorCode.MissingRecord) {
          throw error;
        }

        throw new InternalServerErrorResult(error.name, error.message);
    }
  }

  public async decryptCryptoTicket(request: DecryptCryptoTicketRequest): Promise<GetCryptoTicketResponse> {
    // generate and encrypt
    try{
        const ticket = await this._repo.getTicket(request.id);
        if(!ticket) throw new NotFoundResult(ErrorCode.MissingRecord, 'Could not find the crypto ticket with ID : ' + request.id);
        const decryptContent = this._encryption.decrypt(ticket.text, request.password, ticket.iv, ticket.tag);
        if(ticket.oneTime) {
          // delete... 
           this._repo.deleteTicket(request.id);
        }
        return {
          id: ticket.id, 
          text: decryptContent,
          expires: ticket.expires,
          expired: ticket.oneTime,
          created: ticket.created,
          oneTime: ticket.oneTime
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

  public async deleteCryptoTicket(request: DeleteCryptoTicketRequest): Promise<GetCryptoTicketResponse> {
    try{
        const ticket = await this._repo.getTicket(request.id);
         if(!ticket) throw new NotFoundResult(ErrorCode.MissingRecord, 'Could not find the crypto ticket with ID : ' + request.id);
        const decryptContent = this._encryption.decrypt(ticket.text, request.password, ticket.iv, ticket.tag);
        
        this._repo.deleteTicket(request.id);

        return {
          id: ticket.id, 
          text: decryptContent,
          expires: ticket.expires,
          expired: ticket.oneTime,
          created: ticket.created,
          oneTime: ticket.oneTime
        };
    }
    catch(error) {
      console.log(error)
      if (error.code == ErrorCode.MissingRecord) {
          throw error;
      }

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
