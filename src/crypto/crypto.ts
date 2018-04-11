import { ApiHandler } from '../../shared/api.interfaces';
import { CryptoController } from './crypto.controller';
import { CryptoRepository } from './crypto.repository';
import { CryptoService } from './crypto.service';
import { Encryption } from '../services/encryption'

// This workaround is required becase Serverless Offline does not set environment variables properly.
// See: https://github.com/dherault/serverless-offline/issues/189
const ticketTableName = <string>(process.env.TICKET_TABLE_NAME)
const repo: CryptoRepository = new CryptoRepository(ticketTableName);
const encryption: Encryption = new Encryption(process.env.ENCRYPTION_ALGORITHM )
const service: CryptoService = new CryptoService(process.env.FIREBASE_WEBHOOK_URL, repo, encryption, process.env);
const controller: CryptoController = new CryptoController(service);
export const createCryptoTicket: ApiHandler = controller.createCryptoJson;
export const getCryptoTicket : ApiHandler = controller.getCryptoJson;
export const decryptCryptoTicket : ApiHandler = controller.decryptCryptoJson
export const deleteCryptoTicket : ApiHandler = controller.deleteCryptoJson
export const deleteCryptoTicketSchedule: ApiHandler = controller.deleteCryptoTicketSchedule
