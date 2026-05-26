import { NotFoundException } from '@nestjs/common';

import { ApiKeysService } from './api-keys.service';

describe('ApiKeysService', () => {
  const prisma = {
    tenant: {
      findUnique: jest.fn(),
    },
    apiKey: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const configService = {
    getOrThrow: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    configService.getOrThrow.mockReturnValue('test-pepper');
  });

  it('creates an API key for an existing tenant', async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');

    prisma.tenant.findUnique.mockResolvedValue({
      id: 'tenant_1',
    });

    prisma.apiKey.create.mockResolvedValue({
      id: 'api_key_1',
      tenantId: 'tenant_1',
      name: 'Development key',
      keyHash: 'stored_hash',
      keyPrefix: 'tai_prefix',
      createdAt,
      revokedAt: null,
    });

    const service = new ApiKeysService(prisma as never, configService as never);

    const response = await service.create('tenant_1', {
      name: 'Development key',
    });

    expect(response).toEqual({
      id: 'api_key_1',
      name: 'Development key',
      keyPrefix: 'tai_prefix',
      apiKey: expect.stringMatching(/^tai_[a-f0-9]{64}$/),
      createdAt,
    });

    expect(prisma.tenant.findUnique).toHaveBeenCalledWith({
      where: {
        id: 'tenant_1',
      },
    });

    expect(prisma.apiKey.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant_1',
        name: 'Development key',
        keyHash: expect.any(String),
        keyPrefix: expect.stringMatching(/^tai_[a-f0-9]{8}$/),
      },
    });
  });

  it('throws not found when tenant does not exist', async () => {
    prisma.tenant.findUnique.mockResolvedValue(null);

    const service = new ApiKeysService(prisma as never, configService as never);

    await expect(
      service.create('missing_tenant', {
        name: 'Development key',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(prisma.apiKey.create).not.toHaveBeenCalled();
  });

  it('lists API keys without keyHash', async () => {
    prisma.apiKey.findMany.mockResolvedValue([]);

    const service = new ApiKeysService(prisma as never, configService as never);

    await expect(service.findAllByTenant('tenant_1')).resolves.toEqual([]);

    expect(prisma.apiKey.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant_1',
      },
      omit: {
        keyHash: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  });
});