import { DynamoDB  } from 'aws-sdk';
import { CreateCryptoTicketResult, CreateCryptoTicketRequest } from './crypto.interfaces'

export class CryptoRepository {
  private _db: DynamoDB.DocumentClient;
  public constructor(private _ticketTableName: string) {
    this._db = new DynamoDB.DocumentClient();
  }

  public async createTicket(ticket: CreateCryptoTicketRequest): Promise<void> {
    const params = {
      TableName: this._ticketTableName,
      Item: ticket
    }
    await dynamoDb.put(params).toPromise()
  }
}
