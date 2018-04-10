import { AWSError } from 'aws-sdk'
import { generate } from 'shortid'
import * as fbAdmin from 'firebase-admin'

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

        // Fetch the service account key JSON file contents
        const serviceAccount = require("./firebase-admin-token.json");

        // Initialize the app with a service account, granting admin privileges
        fbAdmin.initializeApp({
          credential: fbAdmin.credential.cert(serviceAccount),
          databaseURL: 'https://cryptobin-e87cc.firebaseio.com',
        }, ticket.id);

        // As an admin, the app has access to read and write all data, regardless of Security Rules
        const db = fbAdmin.database();
        const ref = db.ref("/");
        let oldvalue = 0;
        ref.once("value", function(snapshot) {
          console.log(snapshot.val());
          oldvalue = snapshot.val().submit
          console.log('old value', oldvalue)
          ref.set({submit:oldvalue+1}, function(err) {
            console.log(err)
          })
        });
        return {id: ticket.id , expires: ticket.expires};
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
