import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  const jwtService = {
    verifyAsync: jest.fn(),
  };

  const configService = {
    getOrThrow: jest.fn(),
  };

  const request = {
    headers: {},
  };

  const context = {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(request),
    }),
  };

  let guard: JwtAuthGuard;

  beforeEach(() => {
    jest.clearAllMocks();

    request.headers = {};
    configService.getOrThrow.mockReturnValue('jwt-secret');

    guard = new JwtAuthGuard(
      jwtService as unknown as JwtService,
      configService as never,
    );
  });

  it('allows requests with a valid bearer token', async () => {
    request.headers = {
      authorization: 'Bearer valid-token',
    };

    jwtService.verifyAsync.mockResolvedValue({
      sub: 'user_1',
      email: 'admin@example.com',
      role: 'tenant_admin',
      tenantId: 'tenant_1',
    });

    await expect(guard.canActivate(context as never)).resolves.toBe(true);

    expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-token', {
      secret: 'jwt-secret',
    });

    expect(request).toEqual({
      headers: {
        authorization: 'Bearer valid-token',
      },
      user: {
        id: 'user_1',
        email: 'admin@example.com',
        role: 'tenant_admin',
        tenantId: 'tenant_1',
      },
    });
  });

  it('rejects requests without a bearer token', async () => {
    await expect(guard.canActivate(context as never)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rejects requests with an invalid bearer token', async () => {
    request.headers = {
      authorization: 'Bearer invalid-token',
    };

    jwtService.verifyAsync.mockRejectedValue(new Error('Invalid token'));

    await expect(guard.canActivate(context as never)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});