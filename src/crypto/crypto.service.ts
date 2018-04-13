import { AWSError } from 'aws-sdk'
import { generate } from 'shortid'

import { ErrorCode } from '../../shared/error-codes';
import { ConfigurationErrorResult, ForbiddenResult, InternalServerErrorResult, NotFoundResult } from '../../shared/errors';
import { CreateCryptoTicketResult, CreateCryptoTicketRequest, GetCryptoTicketResponse, DecryptCryptoTicketRequest, DeleteCryptoTicketRequest } from './crypto.interfaces';
import { CryptoRepository } from './crypto.repository';
import { Encryption } from '../services/encryption'
import { Util } from '../services/util'
import Axios from 'axios'
export class CryptoService {
  public constructor(private _webhook:string, private _repo: CryptoRepository,
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
    try {
        await this._repo.createTicket(ticket);
        if(this._webhook !== undefined) {
          await Axios.post(this._webhook, {mode: 'encrypt'})
        }
        return {id: ticket.id , expires: ticket.expires};
    }catch(error) {
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

  public async getCryptoTicket(ticketId: string, ip:string): Promise<GetCryptoTicketResponse> {
    try{
        const ticket = await this._repo.getTicket(ticketId)
        if(!ticket) throw new NotFoundResult(ErrorCode.MissingRecord, 'Could not find the crypto ticket with ID : ' + ticketId);

        if(ticket && ticket.ipAddresses && ticket.ipAddresses.length > 0 && ticket.ipAddresses.indexOf(ip) < 0) {
          throw new ForbiddenResult(ErrorCode.MissingPermission, 'This is ip restricted ticket, Your IP is not allow to access this ticket');
        }
        if(ticket.expires < Util.unix()) {
          await this._repo.deleteTicket(ticketId);
          return undefined
        }
        return {
          created: ticket.created,
          expired: false,
          expires: ticket.expires,
          id: ticket.id,
          oneTime: ticket.oneTime,
          text: ticket.text,
        };
    }
    catch(error) {
      console.log(error)
        if (error.code === 'AccessDeniedException') {
          throw new ForbiddenResult(ErrorCode.MissingPermission, error.message);
        }

        if (error.code == ErrorCode.MissingRecord || error.code == ErrorCode.MissingPermission) {
          throw error;
        }

        throw new InternalServerErrorResult(error.name, error.message);
    }
  }

  public async decryptCryptoTicket(request: DecryptCryptoTicketRequest, ip: string): Promise<GetCryptoTicketResponse> {
    // generate and encrypt
    try{
        const ticket = await this._repo.getTicket(request.id);
        if(!ticket) throw new NotFoundResult(ErrorCode.MissingRecord, 'Could not find the crypto ticket with ID : ' + request.id);

        if(ticket && ticket.ipAddresses && ticket.ipAddresses.length > 0 && ticket.ipAddresses.indexOf(ip) < 0) {
          throw new ForbiddenResult(ErrorCode.MissingPermission, 'This is ip restricted ticket, Your IP is not allow to access this ticket');
        }

        const decryptContent = this._encryption.decrypt(ticket.text, request.password, ticket.iv, ticket.tag);
        if(ticket.oneTime) {
          // delete...
           this._repo.deleteTicket(request.id);
        }
        if(this._webhook !== undefined) {
          await Axios.post(this._webhook, {mode: 'decrypt'})
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

        if (error.code == ErrorCode.MissingRecord || error.code == ErrorCode.MissingPermission) {
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
          expired: ticket.oneTime,
          expires: ticket.expires,
          created: ticket.created,
          oneTime: ticket.oneTime
        };
    }
    catch(error) {
      console.log(error)
      if (error.code === ErrorCode.MissingRecord) {
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
  public async deleteCryptoTicketSchedule(): Promise<void> {
    try{
      // get item
      const nowTime = Util.unix();
      const scanOptions = {
        ProjectionExpression: '#id',
        FilterExpression: 'expires  < :nowTime',
        ExpressionAttributeNames: {
          '#id': 'id'
        },
        ExpressionAttributeValues: {
          ':nowTime': nowTime,
        }

      }
      const retrieveListResult = await this._repo.retrieveList(scanOptions)
      //delete item
      console.log('event executed....', retrieveListResult)
      const page = retrieveListResult.length/25;
      const promises = []
      for(var i=0; i< page; i++) {
        const currentPage = retrieveListResult.slice(i * 25, (i + 1) * 25);
        const task =  this._repo.deleteItems(currentPage.map(x=>x.id))
        promises.push(task)
      }
      await Promise.all(promises)
    }
    catch(error) {
      console.log(error)

      if (error.code === 'AccessDeniedException') {
        throw new ForbiddenResult(ErrorCode.MissingPermission, error.message);
      }

      throw new InternalServerErrorResult(error.name, error.message);
    }
  }
}
