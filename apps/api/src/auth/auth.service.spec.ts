import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

import { AuthService } from './auth.service';
import { PasswordHasherService } from './password-hasher.service';

describe('AuthService', () => {
  const createdTenant = {
    id: 'tenant_1',
    name: 'Demo Company',
    slug: 'demo-company-12345678',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const createdUser = {
    id: 'user_1',
    tenantId: 'tenant_1',
    email: 'admin@example.com',
    name: 'Admin User',
    passwordHash: 'hashed-password',
    role: 'tenant_admin' as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const prisma = {
    user: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const passwordHasher = {
    hash: jest.fn(),
    verify: jest.fn(),
  };

  const jwtService = {
    signAsync: jest.fn(),
  };

  const configService = {
    getOrThrow: jest.fn(),
    get: jest.fn(),
  };

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();

    configService.getOrThrow.mockReturnValue('jwt-secret');
    configService.get.mockReturnValue('1d');
    jwtService.signAsync.mockResolvedValue('jwt-token');

    service = new AuthService(
      prisma as never,
      passwordHasher as unknown as PasswordHasherService,
      jwtService as unknown as JwtService,
      configService as never,
    );
  });

  it('registers a tenant admin user and returns an access token', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    passwordHasher.hash.mockResolvedValue('hashed-password');

    prisma.$transaction.mockImplementation(async (callback) => {
      return callback({
        tenant: {
          create: jest.fn().mockResolvedValue(createdTenant),
        },
        user: {
          create: jest.fn().mockResolvedValue(createdUser),
        },
      });
    });

    await expect(
      service.register({
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'password123',
        companyName: 'Demo Company',
      }),
    ).resolves.toEqual({
      accessToken: 'jwt-token',
      user: {
        id: 'user_1',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'tenant_admin',
        tenantId: 'tenant_1',
      },
    });

    expect(passwordHasher.hash).toHaveBeenCalledWith('password123');
    expect(jwtService.signAsync).toHaveBeenCalledWith(
      {
        sub: 'user_1',
        email: 'admin@example.com',
        role: 'tenant_admin',
        tenantId: 'tenant_1',
      },
      {
        secret: 'jwt-secret',
        expiresIn: '1d',
      },
    );
  });

  it('rejects registration when email already exists', async () => {
    prisma.user.findUnique.mockResolvedValue(createdUser);

    await expect(
      service.register({
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'password123',
        companyName: 'Demo Company',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('logs in with valid credentials', async () => {
    prisma.user.findUnique.mockResolvedValue(createdUser);
    passwordHasher.verify.mockResolvedValue(true);

    await expect(
      service.login({
        email: 'admin@example.com',
        password: 'password123',
      }),
    ).resolves.toEqual({
      accessToken: 'jwt-token',
      user: {
        id: 'user_1',
        email: 'admin@example.com',
        name: 'Admin User',
        role: 'tenant_admin',
        tenantId: 'tenant_1',
      },
    });
  });

  it('rejects login when password is invalid', async () => {
    prisma.user.findUnique.mockResolvedValue(createdUser);
    passwordHasher.verify.mockResolvedValue(false);

    await expect(
      service.login({
        email: 'admin@example.com',
        password: 'wrong-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});