import { DynamoDB  } from 'aws-sdk';
import { CreateCryptoTicketRequest, CryptoTicket } from './crypto.interfaces'

export class CryptoRepository {
  private _db:DynamoDB.DocumentClient;
  public constructor(private _ticketTableName: string) {
    this._db = new DynamoDB.DocumentClient();
  }

  public async createTicket(ticket: CreateCryptoTicketRequest): Promise<void> {
    const params = {
      TableName: this._ticketTableName,
      Item: ticket
    }
    await this._db.put(params).promise()
  }
  public async getTicket(ticketId:string) : Promise<CryptoTicket> {
     const params = {
      TableName: this._ticketTableName,
      Key: {
        id: ticketId
      },
    }
    const result = await this._db.get(params).promise()
    return <CryptoTicket> result.Item
  }
}
