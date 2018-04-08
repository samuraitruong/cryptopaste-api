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
  public async deleteItems (keys) : Promise<void> {
    const params = {
      RequestItems: {
      }
    }
    const itemsToDelete:any = keys.map( x => {
      const item =  {
        DeleteRequest: {
          Key: {
            id: x
          }
        }
      }
      return item

    })

    params.RequestItems[this._ticketTableName] = itemsToDelete
    try {
      await this._db.batchWrite(params).promise()
    } catch (err) {
      console.log(err)
    }
  }

  public async retrieveList (scanOptions) : Promise<any> {
    const params:any = {
      TableName: this._ticketTableName,
      ...scanOptions
    }
    try {
      const scanResult = await this._db.scan(params).promise()
      return scanResult.Items
    } catch (err) {
      console.log(err)

    }
    return null
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

  public async deleteTicket(ticketId:string) : Promise<boolean> {
     const params = {
      TableName: this._ticketTableName,
      Key: {
        id: ticketId
      },
    }
    await this._db.delete(params).promise()
    return true
  }

}
