import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { ApiKeysService } from '../api-keys/api-keys.service';
import { type ApiKeyAuthenticatedRequest } from './api-key-authenticated-request';

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<ApiKeyAuthenticatedRequest>();
    const apiKey = this.extractApiKey(request);

    if (!apiKey) {
      throw new UnauthorizedException('Missing API key');
    }

    const authenticatedApiKey = await this.apiKeysService.authenticate(apiKey);

    if (!authenticatedApiKey) {
      throw new UnauthorizedException('Invalid API key');
    }

    request.apiKey = authenticatedApiKey;

    return true;
  }

  private extractApiKey(request: ApiKeyAuthenticatedRequest): string | null {
    const headerValue = request.headers['x-api-key'];

    if (Array.isArray(headerValue)) {
      return headerValue[0] ?? null;
    }

    return headerValue ?? null;
  }
}