export interface CreateCryptoTicketResult {
    id: String,
    expires: Number
}
export interface CryptoSetting {
    TICKET_TABLE_NAME: string
}
export interface CreateCryptoTicketRequest {
    id:string?,
    text: String,
    password: String,
    expires: Number
}