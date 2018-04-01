//import { APIGateway, AWSError } from 'aws-sdk';
import { CreateCryptoTicketResult, CreateCryptoTicketRequest } from './crypto.interfaces'

export class CryptoRepository {
  public constructor(private _ticketTableName: string) {
  }

  public async createTicket(ticket: CreateCryptoTicketRequest): Promise<CreateCryptoTicketResult> {
    console.log(this._ticketTableName);
    return { id:'12', expires:17890234 }
  }
}
