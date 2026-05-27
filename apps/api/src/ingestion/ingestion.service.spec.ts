import { BadRequestException, NotFoundException } from '@nestjs/common';

import { IngestionService } from './ingestion.service';

describe('IngestionService', () => {
  const prisma = {
    document: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    documentChunk: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
  };

  const objectStorage = {
    getObject: jest.fn(),
    putObject: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.document.update.mockResolvedValue({});
    prisma.documentChunk.deleteMany.mockResolvedValue({ count: 0 });
    prisma.documentChunk.createMany.mockResolvedValue({ count: 1 });
  });

  it('ingests a text document into chunks for the authenticated tenant', async () => {
    prisma.document.findFirst.mockResolvedValue({
      id: 'document_1',
      tenantId: 'tenant_1',
      mimeType: 'text/plain',
      storageKey: 'tenant_1/documents/document_1.txt',
    });

    objectStorage.getObject.mockResolvedValue({
      key: 'tenant_1/documents/document_1.txt',
      body: Buffer.from('Hello world. This is a test document.'),
      contentType: 'text/plain',
    });

    const service = new IngestionService(
      prisma as never,
      objectStorage as never,
    );

    await expect(
      service.ingestDocument('tenant_1', 'document_1'),
    ).resolves.toEqual({
      documentId: 'document_1',
      status: 'ready',
      chunksCreated: 1,
    });

    expect(prisma.document.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'document_1',
        tenantId: 'tenant_1',
      },
    });

    expect(objectStorage.getObject).toHaveBeenCalledWith({
      key: 'tenant_1/documents/document_1.txt',
    });

    expect(prisma.documentChunk.deleteMany).toHaveBeenCalledWith({
      where: {
        documentId: 'document_1',
        tenantId: 'tenant_1',
      },
    });

    expect(prisma.documentChunk.createMany).toHaveBeenCalledWith({
      data: [
        {
          tenantId: 'tenant_1',
          documentId: 'document_1',
          content: 'Hello world. This is a test document.',
          chunkIndex: 0,
        },
      ],
    });

    expect(prisma.document.update).toHaveBeenLastCalledWith({
      where: {
        id: 'document_1',
      },
      data: {
        status: 'ready',
      },
    });
  });

  it('throws not found when document does not belong to tenant', async () => {
    prisma.document.findFirst.mockResolvedValue(null);

    const service = new IngestionService(
      prisma as never,
      objectStorage as never,
    );

    await expect(
      service.ingestDocument('tenant_1', 'missing_document'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(objectStorage.getObject).not.toHaveBeenCalled();
  });

  it('rejects documents without stored file', async () => {
    prisma.document.findFirst.mockResolvedValue({
      id: 'document_1',
      tenantId: 'tenant_1',
      mimeType: 'text/plain',
      storageKey: null,
    });

    const service = new IngestionService(
      prisma as never,
      objectStorage as never,
    );

    await expect(
      service.ingestDocument('tenant_1', 'document_1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects unsupported mime types', async () => {
    prisma.document.findFirst.mockResolvedValue({
      id: 'document_1',
      tenantId: 'tenant_1',
      mimeType: 'application/pdf',
      storageKey: 'tenant_1/documents/document_1.pdf',
    });

    const service = new IngestionService(
      prisma as never,
      objectStorage as never,
    );

    await expect(
      service.ingestDocument('tenant_1', 'document_1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});