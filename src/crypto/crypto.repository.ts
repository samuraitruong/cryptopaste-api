import { DynamoDB, S3 } from 'aws-sdk';
import { CreateCryptoTicketRequest, CryptoTicket } from './crypto.interfaces';

export class CryptoRepository {
  private _db: DynamoDB.DocumentClient;
  private _bucket : S3;

  public constructor(private _ticketTableName: string, private _bucketName: string) {
    this._db = new DynamoDB.DocumentClient();
    this._bucket = new S3({
      // endpoint: _bucketName
    });
  }

  public async deleteS3File(key: string): Promise<void> {
    const putRequest: S3.DeleteObjectRequest = {
      Bucket: this._bucketName,
      Key: key
    };
    const response: S3.DeleteObjectOutput = await this._bucket.deleteObject(putRequest)
                        .promise();

  }
  public async deleteS3Files(keys: string[]): Promise<void> {
    const objectToDelete: S3.ObjectIdentifierList = keys.map((key: string) =>  {
      const deleteObject: S3.ObjectIdentifier = {
        Key: key
      };
      return deleteObject;
    });
    const deleteObjectsRequest: S3.DeleteObjectsRequest = {
      Bucket: this._bucketName,
      Delete :  {
        Objects: objectToDelete
      }
    };

    const response: S3.DeleteObjectsOutput = await this._bucket.deleteObjects(deleteObjectsRequest)
                        .promise();

  }
  public async getS3Content(key: string): Promise<string> {
    const putRequest: S3.GetObjectRequest = {
      Bucket: this._bucketName,
      Key: key
    };
    const response: S3.GetObjectOutput = await this._bucket.getObject(putRequest)
                        .promise();
    return response.Body.toString();
  }

  public async uploadS3(content: string, key: string): Promise<S3.PutObjectOutput> {
    const putRequest: S3.PutObjectRequest = {
      ACL: 'public-read',
      Body: content,
      Bucket: this._bucketName,
      Key: key
    };
    const response: S3.PutObjectOutput = await this._bucket.putObject(putRequest)
                        .promise();
    return response;
  }
  public async createTicket(ticket: CreateCryptoTicketRequest): Promise<void> {
    const params = {
      TableName: this._ticketTableName,
      Item: ticket
    }

    await this._db.put(params)
                  .promise();
  }
  public async deleteItems(keys: string[]): Promise<void> {
    const params: any = {
      RequestItems: {
      }
    }
    const itemsToDelete:any = keys.map(x => {
      const item: any =  {
        DeleteRequest: {
          Key: {
            id: x
          }
        }
      }
      return item;

    });

    params.RequestItems[this._ticketTableName] = itemsToDelete
    try {
      await this._db.batchWrite(params).promise();
    } catch (err) {
      console.log(err);
    }
  }

  public async retrieveList (scanOptions) : Promise<any> {
    const params: DynamoDB.ScanInput = {
      TableName: this._ticketTableName,
      ...scanOptions
    };

    try {
      const scanResult = await this._db.scan(params).promise();
      return scanResult.Items;
    } catch (err) {
      console.log(err);

    }
    return undefined;
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
