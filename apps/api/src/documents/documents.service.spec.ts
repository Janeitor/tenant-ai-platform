import { DocumentsService } from './documents.service';

describe('DocumentsService', () => {
  const prisma = {
    document: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates document metadata for a tenant', async () => {
    const document = {
      id: 'document_1',
      tenantId: 'tenant_1',
      name: 'HR Policy.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 12345,
      status: 'pending',
      storageKey: null,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    };

    prisma.document.create.mockResolvedValue(document);

    const service = new DocumentsService(prisma as never);

    await expect(
      service.create('tenant_1', {
        name: 'HR Policy.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 12345,
      }),
    ).resolves.toEqual(document);

    expect(prisma.document.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant_1',
        name: 'HR Policy.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 12345,
      },
    });
  });

  it('lists only documents for the authenticated tenant', async () => {
    prisma.document.findMany.mockResolvedValue([]);

    const service = new DocumentsService(prisma as never);

    await expect(service.findAllByTenant('tenant_1')).resolves.toEqual([]);

    expect(prisma.document.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant_1',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  });
});