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
      findMany: jest.fn(),
    },
    documentChunk: {
      count: jest.fn(),
    },
    usageLog: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    apiKey: {
      findMany: jest.fn(),
    },
  };

  const apiKeysService = {
    create: jest.fn(),
  };

  const documentsService = {
    upload: jest.fn(),
  };

  const ingestionService = {
    ingestDocument: jest.fn(),
  };

  let service: TenantAdminService;

  beforeEach(() => {
    jest.clearAllMocks();

    prisma.tenant.findUniqueOrThrow.mockResolvedValue(tenant);
    prisma.document.count.mockResolvedValue(3);
    prisma.documentChunk.count.mockResolvedValue(12);
    prisma.usageLog.count.mockResolvedValue(5);
    prisma.usageLog.findMany.mockResolvedValue([recentUsageLog]);
    prisma.document.findMany.mockResolvedValue([
      {
        id: 'document_1',
        name: 'Contrato.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 12345,
        status: 'ready',
        createdAt: new Date('2026-06-08T12:00:00.000Z'),
        updatedAt: new Date('2026-06-08T12:10:00.000Z'),
      },
    ]);
    prisma.apiKey.findMany.mockResolvedValue([
      {
        id: 'api_key_1',
        name: 'Production key',
        keyPrefix: 'tai_12345678',
        createdAt: new Date('2026-06-08T12:00:00.000Z'),
        revokedAt: null,
      },
    ]);
    apiKeysService.create.mockResolvedValue({
      id: 'api_key_1',
      name: 'Dashboard key',
      key: 'tai_plaintext_key',
      keyPrefix: 'tai_123456',
      createdAt: new Date('2026-06-08T12:00:00.000Z'),
    });
    documentsService.upload.mockResolvedValue({
      id: 'document_1',
      tenantId: 'tenant_1',
      name: 'Contrato.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 12345,
      status: 'uploaded',
      storageKey: 'tenant_1/documents/Contrato.pdf',
      createdAt: new Date('2026-06-08T12:00:00.000Z'),
      updatedAt: new Date('2026-06-08T12:00:00.000Z'),
    });
    ingestionService.ingestDocument.mockResolvedValue({
      documentId: 'document_1',
      status: 'ready',
      chunksCreated: 3,
    });

    service = new TenantAdminService(
      prisma as never,
      apiKeysService as never,
      documentsService as never,
      ingestionService as never,
    );
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

  it('lists documents for the authenticated tenant admin tenant', async () => {
    await expect(service.listDocuments('tenant_1')).resolves.toEqual([
      {
        id: 'document_1',
        name: 'Contrato.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 12345,
        status: 'ready',
        createdAt: new Date('2026-06-08T12:00:00.000Z'),
        updatedAt: new Date('2026-06-08T12:10:00.000Z'),
      },
    ]);

    expect(prisma.document.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant_1',
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        mimeType: true,
        sizeBytes: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  });

  it('rejects document listing when tenant admin has no tenant assignment', async () => {
    await expect(service.listDocuments(null)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
    it('lists API keys for the authenticated tenant admin tenant', async () => {
    await expect(service.listApiKeys('tenant_1')).resolves.toEqual([
      {
        id: 'api_key_1',
        name: 'Production key',
        keyPrefix: 'tai_12345678',
        createdAt: new Date('2026-06-08T12:00:00.000Z'),
        revokedAt: null,
      },
    ]);

    expect(prisma.apiKey.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant_1',
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        createdAt: true,
        revokedAt: true,
      },
    });
  });

  it('rejects API key listing when tenant admin has no tenant assignment', async () => {
    await expect(service.listApiKeys(null)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('uploads a document for the authenticated tenant admin tenant', async () => {
    const uploadInput = {
      originalName: 'Contrato.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 12345,
      buffer: Buffer.from('pdf content'),
    };

    await expect(
      service.uploadDocument('tenant_1', uploadInput),
    ).resolves.toMatchObject({
      id: 'document_1',
      tenantId: 'tenant_1',
      status: 'uploaded',
    });

    expect(documentsService.upload).toHaveBeenCalledWith(
      'tenant_1',
      uploadInput,
    );
  });

  it('rejects document upload when tenant admin has no tenant assignment', async () => {
    await expect(
      service.uploadDocument(null, {
        originalName: 'Contrato.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 12345,
        buffer: Buffer.from('pdf content'),
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('ingests a document for the authenticated tenant admin tenant', async () => {
    await expect(
      service.ingestDocument('tenant_1', 'document_1'),
    ).resolves.toEqual({
      documentId: 'document_1',
      status: 'ready',
      chunksCreated: 3,
    });

    expect(ingestionService.ingestDocument).toHaveBeenCalledWith(
      'tenant_1',
      'document_1',
    );
  });

  it('rejects document ingestion when tenant admin has no tenant assignment', async () => {
    await expect(
      service.ingestDocument(null, 'document_1'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
