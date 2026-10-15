export * as billsRepo from './bills';
export * as customersRepo from './customers';
export * as productsRepo from './products';
export * as shopRepo from './shop';
export * as outboxRepo from './outbox';
export { isRepoError, RepoError } from './errors';
export { adoptShop, clearLocalData } from './local-data';
