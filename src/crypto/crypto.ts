import { ApiHandler } from '../../shared/api.interfaces';
import { CryptoController } from './crypto.controller';
import { CryptoRepository } from './crypto.repository';
import { CryptoService } from './crypto.service';

// This workaround is required becase Serverless Offline does not set environment variables properly.
// See: https://github.com/dherault/serverless-offline/issues/189
const ticketTableName = <string>(process.env.TICKET_TABLE_NAME)
const repo: CryptoRepository = new CryptoRepository(ticketTableName);
const service: CryptoService = new CryptoService(repo, process.env);
const controller: CryptoController = new CryptoController(service);

export const createCryptoJson: ApiHandler = controller.createCryptoJson;
