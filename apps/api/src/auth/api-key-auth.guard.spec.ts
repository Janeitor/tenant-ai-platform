import { UnauthorizedException } from '@nestjs/common';
import { type ExecutionContext } from '@nestjs/common';

import { ApiKeyAuthGuard } from './api-key-auth.guard';
import { type ApiKeyAuthenticatedRequest } from './api-key-authenticated-request';

describe('ApiKeyAuthGuard', () => {
  const apiKeysService = {
    authenticate: jest.fn(),
  };

  const createContext = (
    request: Partial<ApiKeyAuthenticatedRequest>,
  ): ExecutionContext =>
    ({
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as ExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('attaches authenticated API key to request', async () => {
    const request: Partial<ApiKeyAuthenticatedRequest> = {
      headers: {
        'x-api-key': 'tai_valid',
      },
    };

    apiKeysService.authenticate.mockResolvedValue({
      id: 'api_key_1',
      tenantId: 'tenant_1',
      keyPrefix: 'tai_valid',
    });

    const guard = new ApiKeyAuthGuard(apiKeysService as never);

    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);

    expect(apiKeysService.authenticate).toHaveBeenCalledWith('tai_valid');
    expect(request.apiKey).toEqual({
      id: 'api_key_1',
      tenantId: 'tenant_1',
      keyPrefix: 'tai_valid',
    });
  });

  it('throws unauthorized when API key is missing', async () => {
    const request: Partial<ApiKeyAuthenticatedRequest> = {
      headers: {},
    };

    const guard = new ApiKeyAuthGuard(apiKeysService as never);

    await expect(guard.canActivate(createContext(request))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    expect(apiKeysService.authenticate).not.toHaveBeenCalled();
  });

  it('throws unauthorized when API key is invalid', async () => {
    const request: Partial<ApiKeyAuthenticatedRequest> = {
      headers: {
        'x-api-key': 'tai_invalid',
      },
    };

    apiKeysService.authenticate.mockResolvedValue(null);

    const guard = new ApiKeyAuthGuard(apiKeysService as never);

    await expect(guard.canActivate(createContext(request))).rejects.toBeInstanceOf(
      UnauthorizedException,
    );

    expect(apiKeysService.authenticate).toHaveBeenCalledWith('tai_invalid');
  });
});