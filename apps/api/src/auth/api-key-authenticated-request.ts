import { type Request } from 'express';

export interface ApiKeyAuthenticatedRequest extends Request {
  apiKey: {
    id: string;
    tenantId: string;
    keyPrefix: string;
  };
}