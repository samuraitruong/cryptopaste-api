import { AWSError, DynamoDB } from 'aws-sdk';
import Axios from 'axios';
import { generate } from 'shortid';
import { CreateCryptoTicketRequest, CreateCryptoTicketResult, DecryptCryptoTicketRequest, DeleteCryptoTicketRequest, GetCryptoTicketResponse } from './crypto.interfaces';
import { ConfigurationErrorResult, ForbiddenResult, InternalServerErrorResult, NotFoundResult } from '../../shared/errors';
import { CryptoRepository } from './crypto.repository';
import { Encryption } from '../services/encryption'
import { ErrorCode } from '../../shared/error-codes';
import { Util } from '../services/util'
import { EncryptionResponse } from '../services/encryption.interfaces';
export class CryptoService {
  public constructor(private _webhook:string,
    private _repo: CryptoRepository,
    private _encryption : Encryption,
    private _env: NodeJS.ProcessEnv) {
  }

  public async createCryptoTicket(ticket: CreateCryptoTicketRequest): Promise<CreateCryptoTicketResult> {
    // Generate and encrypt
    ticket.id  = generate();

    if (!ticket.clientMode) {
      const encryptResponse: EncryptionResponse = this._encryption.encrypt(ticket.text, ticket.password);
      delete ticket.password;
      ticket.iv = encryptResponse.iv;
      ticket.tag = encryptResponse.tag;
      ticket.text = encryptResponse.content;
    }

    ticket.expires =  Util.unix() + ticket.expires * 60

    try {
        if (ticket.text.length > 199000) {
          await this._repo.uploadS3(ticket.text, ticket.id);
          delete ticket.text;
          ticket.s3 = true;
        }
        await this._repo.createTicket(ticket);
        if( this._webhook !== undefined ) {
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
    try {
        const ticket = await this._repo.getTicket(ticketId)
        if( !ticket) throw new NotFoundResult(ErrorCode.MissingRecord, 'Could not find the crypto ticket with ID : ' + ticketId);

        if(ticket && ticket.ipAddresses && ticket.ipAddresses.length > 0 && ticket.ipAddresses.indexOf(ip) < 0) {
          throw new ForbiddenResult(ErrorCode.MissingPermission, 'This is ip restricted ticket, Your IP is not allow to access this ticket');
        }
        if( ticket.expires < Util.unix()) {
          await this._repo.deleteTicket(ticketId);
          return undefined;
        }
        const response: GetCryptoTicketResponse = {
          clientMode: ticket.clientMode,
          created: ticket.created,
          expired: false,
          expires: ticket.expires,
          id: ticket.id,
          oneTime: ticket.oneTime,
          text: ticket.text,
          iv: undefined,
          tag: undefined,
          s3: ticket.s3
        };
        if(response.clientMode) {
          response.iv = ticket.iv;
          response.tag = ticket.tag;
        }
        return response;
    }
    catch(error) {
      console.log(error);
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
    try{
        const ticket = await this._repo.getTicket(request.id);
        if(!ticket) { throw new NotFoundResult(ErrorCode.MissingRecord, 'Could not find the crypto ticket with ID : ' + request.id); }

        if(ticket && ticket.ipAddresses && ticket.ipAddresses.length > 0 && ticket.ipAddresses.indexOf(ip) < 0) {
          throw new ForbiddenResult(ErrorCode.MissingPermission, 'This is ip restricted ticket, Your IP is not allow to access this ticket');
        }
        if(ticket.s3) {
          ticket.text = await this._repo.getS3Content(ticket.id)
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
    try {
        const ticket = await this._repo.getTicket(request.id);
        if(!ticket) { throw new NotFoundResult(ErrorCode.MissingRecord, 'Could not find the crypto ticket with ID : ' + request.id); }
        let decryptContent: string = ''
        if(!ticket.clientMode){
          if(ticket.s3) {
            ticket.text = await this._repo.getS3Content(ticket.id)
          }

          decryptContent = this._encryption.decrypt(ticket.text, request.password, ticket.iv, ticket.tag);

        }
        if(ticket.s3) {
          // delete file on S3
          await this._repo.deleteS3File(ticket.id);
        }
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
        ExpressionAttributeNames: {
          '#id': 'id'
        },
        ExpressionAttributeValues: {
          ':nowTime': nowTime,
        },
        FilterExpression: 'expires  < :nowTime',
        ProjectionExpression: '#id'
      };

      const retrieveListResult = await this._repo.retrieveList(scanOptions);
      // Delete item
      console.log('event executed....', retrieveListResult);
      const page = retrieveListResult.length / 25;
      const promises = [];
      for (let i:number = 0; i < page; i++) {
        const currentPage = retrieveListResult.slice(i * 25, (i + 1) * 25);
        const ids = currentPage.map((x) => x.id)
        const task =  this._repo.deleteItems(ids);
        const task2 =  this._repo.deleteS3Files(ids);
        promises.push(task);
        promises.push(task2);
      }
      await Promise.all(promises);
    } catch(error) {
      console.log(error);

      if (error.code === 'AccessDeniedException') {
        throw new ForbiddenResult(ErrorCode.MissingPermission, error.message);
      }

      throw new InternalServerErrorResult(error.name, error.message);
    }
  }
}
