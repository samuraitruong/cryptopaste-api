export interface CreateCryptoTicketResult {
    id: String,
    expires: number
}

export interface CryptoSetting {
    TICKET_TABLE_NAME: string
}
export interface DecryptCryptoTicketRequest {
    id:string,
    password:string
}
export interface CryptoTicket {
    id:string,
    text:string,
    expires:number,
    oneTime: boolean,
    iv:any;
    tag:any,
    created: number,
    ipAddresses: string[],
    clientMode: boolean
}
export interface CreateCryptoTicketRequest extends CryptoTicket {
    password: string
}
export interface GetCryptoTicketResponse {
    id: string;
    text: string;
    expires: number;
    created: number;
    expired: boolean;
    oneTime?: boolean;
    iv?: string;
    key?: string;
}
export interface DeleteCryptoTicketRequest extends DecryptCryptoTicketRequest {

}
