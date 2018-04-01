const crypto = require('crypto');
import { EncryptionResponse } from './encryption.interfaces'
// http://lollyrock.com/articles/nodejs-encryption/
export class Encryption {
    public constructor(private _algorithm:string | undefined='' ) {

    }

    public encrypt (text: string, password:string): EncryptionResponse  {
        const key = crypto.randomBytes(32);
        const cipher = crypto.createCipheriv(this._algorithm, key, password);
        let encrypted:string = cipher.update(text,'utf8','base64');
        encrypted += cipher.final('base64');
        const tag = cipher.getAuthTag();
        return {
            content: encrypted,
            iv: key,
            tag: tag
        };
    }
    public decrypt(text:string, password:string, iv:string, tag:string): string  {
        const decipher  = crypto.createDecipheriv(this._algorithm, iv, password);
        decipher.setAuthTag(tag);
        let dec = decipher.update(text,'base64','utf8');
        dec += decipher.final('utf8');
        return dec;
    }
}