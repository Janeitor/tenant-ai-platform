import { UnauthorizedException } from '@nestjs/common';

import { TenantAdminService } from './tenant-admin.service';

describe('TenantAdminService', () => {
  const tenant = {
    id: 'tenant_1',
    name: 'Demo Company',
    slug: 'demo-company',
  };

  const recentUsageLog = {
    id: 'usage_1',
    provider: 'openai',
    model: 'gpt-5-mini',
    inputTokens: 100,
    outputTokens: 50,
    totalTokens: 150,
    estimatedCostUsd: null,
    contextTokens: 80,
    selectedChunks: 2,
    maxContextTokens: 8000,
    candidateLimit: 5,
    createdAt: new Date('2026-06-08T12:00:00.000Z'),
  };

  const prisma = {
    tenant: {
      findUniqueOrThrow: jest.fn(),
    },
    document: {
      count: jest.fn(),
    },
    documentChunk: {
      count: jest.fn(),
    },
    usageLog: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const apiKeysService = {
    create: jest.fn(),
  };

  let service: TenantAdminService;

  beforeEach(() => {
    jest.clearAllMocks();

    prisma.tenant.findUniqueOrThrow.mockResolvedValue(tenant);
    prisma.document.count.mockResolvedValue(3);
    prisma.documentChunk.count.mockResolvedValue(12);
    prisma.usageLog.count.mockResolvedValue(5);
    prisma.usageLog.findMany.mockResolvedValue([recentUsageLog]);
    apiKeysService.create.mockResolvedValue({
      id: 'api_key_1',
      name: 'Dashboard key',
      key: 'tai_plaintext_key',
      keyPrefix: 'tai_123456',
      createdAt: new Date('2026-06-08T12:00:00.000Z'),
    });

    service = new TenantAdminService(prisma as never, apiKeysService as never);
  });

  it('returns a tenant-scoped admin summary', async () => {
    await expect(service.getSummary('tenant_1')).resolves.toEqual({
      tenant,
      metrics: {
        documents: 3,
        chunks: 12,
        usageLogs: 5,
      },
      recentUsageLogs: [recentUsageLog],
    });

    expect(prisma.document.count).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant_1',
      },
    });

    expect(prisma.documentChunk.count).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant_1',
      },
    });

    expect(prisma.usageLog.count).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant_1',
      },
    });

    expect(prisma.usageLog.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant_1',
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
      select: expect.any(Object),
    });
  });

  it('rejects tenant admin users without tenant assignment', async () => {
    await expect(service.getSummary(null)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

    it('creates an API key for the authenticated tenant admin tenant', async () => {
    await expect(
      service.createApiKey('tenant_1', {
        name: 'Dashboard key',
      }),
    ).resolves.toEqual({
      id: 'api_key_1',
      name: 'Dashboard key',
      key: 'tai_plaintext_key',
      keyPrefix: 'tai_123456',
      createdAt: new Date('2026-06-08T12:00:00.000Z'),
    });

    expect(apiKeysService.create).toHaveBeenCalledWith('tenant_1', {
      name: 'Dashboard key',
    });
  });

  it('rejects API key creation when tenant admin has no tenant assignment', async () => {
    await expect(
      service.createApiKey(null, {
        name: 'Dashboard key',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});