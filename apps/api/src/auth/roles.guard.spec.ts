import { Reflector } from '@nestjs/core';

import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  };

  const request = {
    user: {
      id: 'user_1',
      email: 'admin@example.com',
      role: 'tenant_admin',
      tenantId: 'tenant_1',
    },
  };

  const context = {
    getHandler: jest.fn(),
    getClass: jest.fn(),
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(request),
    }),
  };

  let guard: RolesGuard;

  beforeEach(() => {
    jest.clearAllMocks();

    request.user = {
      id: 'user_1',
      email: 'admin@example.com',
      role: 'tenant_admin',
      tenantId: 'tenant_1',
    };

    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('allows requests when no roles are required', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);

    expect(guard.canActivate(context as never)).toBe(true);
  });

  it('allows requests when user has a required role', () => {
    reflector.getAllAndOverride.mockReturnValue(['tenant_admin']);

    expect(guard.canActivate(context as never)).toBe(true);
  });

  it('rejects requests when user does not have a required role', () => {
    reflector.getAllAndOverride.mockReturnValue(['system_admin']);

    expect(guard.canActivate(context as never)).toBe(false);
  });
});