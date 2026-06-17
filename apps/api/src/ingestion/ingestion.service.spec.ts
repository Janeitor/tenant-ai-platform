import { BadRequestException, NotFoundException } from '@nestjs/common';

import { IngestionService } from './ingestion.service';

describe('IngestionService', () => {
  const prisma = {
    $executeRaw: jest.fn(),
    document: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    documentChunk: {
      deleteMany: jest.fn(),
    },
  };

  const objectStorage = {
    getObject: jest.fn(),
    putObject: jest.fn(),
  };

  const embeddingsService = {
    generateEmbedding: jest.fn(),
  };

  const documentTextExtractor = {
    extractText: jest.fn(),
  };

  const configService = {
    getOrThrow: jest.fn(),
  };

  beforeEach(() => {
    configService.getOrThrow.mockReturnValue('1536');
    jest.clearAllMocks();
    prisma.document.update.mockResolvedValue({});
    prisma.documentChunk.deleteMany.mockResolvedValue({ count: 0 });
    prisma.$executeRaw.mockResolvedValue(1);
    embeddingsService.generateEmbedding.mockResolvedValue({
      embedding: Array.from({ length: 1536 }, () => 0.1),
      dimensions: 1536,
      provider: 'local',
      model: 'local-deterministic-1536',
    });
    documentTextExtractor.extractText.mockResolvedValue(
      'Hello world. This is a test document.',
    );
  });

  it('ingests a text document into embedded chunks for the authenticated tenant', async () => {
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
      embeddingsService as never,
      documentTextExtractor as never,
      configService as never,
    );

    await expect(
      service.processDocument('tenant_1', 'document_1')
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

    expect(documentTextExtractor.extractText).toHaveBeenCalledWith({
      body: Buffer.from('Hello world. This is a test document.'),
      mimeType: 'text/plain',
    });

    expect(prisma.documentChunk.deleteMany).toHaveBeenCalledWith({
      where: {
        documentId: 'document_1',
        tenantId: 'tenant_1',
      },
    });

    expect(embeddingsService.generateEmbedding).toHaveBeenCalledWith(
      'Hello world. This is a test document.',
    );

    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);

    expect(prisma.document.update).toHaveBeenLastCalledWith({
      where: {
        id: 'document_1',
      },
      data: {
        status: 'ready',
      },
    });
  });

  it('starts document ingestion and marks the document as processing', async () => {
    prisma.document.findFirst.mockResolvedValueOnce({
      id: 'document_1',
      tenantId: 'tenant_1',
      mimeType: 'text/plain',
      storageKey: 'tenant_1/documents/document_1.txt',
    });

    prisma.document.findFirst.mockResolvedValueOnce(null);

    const service = new IngestionService(
      prisma as never,
      objectStorage as never,
      embeddingsService as never,
      documentTextExtractor as never,
      configService as never,
    );

    await expect(
      service.ingestDocument('tenant_1', 'document_1'),
    ).resolves.toEqual({
      documentId: 'document_1',
      status: 'processing',
      chunksCreated: 0,
    });

    expect(prisma.document.update).toHaveBeenCalledWith({
      where: {
        id: 'document_1',
      },
      data: {
        status: 'processing',
      },
    });

    expect(objectStorage.getObject).not.toHaveBeenCalled();
    expect(embeddingsService.generateEmbedding).not.toHaveBeenCalled();
  });

  it('rejects ingestion when tenant already has another document processing', async () => {
    prisma.document.findFirst.mockResolvedValueOnce({
      id: 'document_1',
      tenantId: 'tenant_1',
      mimeType: 'text/plain',
      storageKey: 'tenant_1/documents/document_1.txt',
    });

    prisma.document.findFirst.mockResolvedValueOnce({
      id: 'document_2',
      name: 'Other document.pdf',
    });

    const service = new IngestionService(
      prisma as never,
      objectStorage as never,
      embeddingsService as never,
      documentTextExtractor as never,
      configService as never,
    );

    await expect(
      service.ingestDocument('tenant_1', 'document_1'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.document.update).not.toHaveBeenCalled();
    expect(objectStorage.getObject).not.toHaveBeenCalled();
  });

  it('throws not found when document does not belong to tenant', async () => {
    prisma.document.findFirst.mockResolvedValue(null);

    const service = new IngestionService(
      prisma as never,
      objectStorage as never,
      embeddingsService as never,
      documentTextExtractor as never,
      configService as never,
    );

    await expect(
      service.ingestDocument('tenant_1', 'missing_document'),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(objectStorage.getObject).not.toHaveBeenCalled();
    expect(embeddingsService.generateEmbedding).not.toHaveBeenCalled();
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
      embeddingsService as never,
      documentTextExtractor as never,
      configService as never,
    );

    await expect(
      service.ingestDocument('tenant_1', 'document_1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects unsupported mime types', async () => {
    prisma.document.findFirst.mockResolvedValue({
      id: 'document_1',
      tenantId: 'tenant_1',
      mimeType: 'image/png',
      storageKey: 'tenant_1/documents/document_1.png',
    });

    objectStorage.getObject.mockResolvedValue({
      key: 'tenant_1/documents/document_1.png',
      body: Buffer.from('image bytes'),
      contentType: 'image/png',
    });

    documentTextExtractor.extractText.mockRejectedValue(
      new BadRequestException('Unsupported document MIME type for ingestion'),
    );

    const service = new IngestionService(
      prisma as never,
      objectStorage as never,
      embeddingsService as never,
      documentTextExtractor as never,
      configService as never,
    );

    await expect(
      service.processDocument('tenant_1', 'document_1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects embeddings when reported dimensions do not match vector length', async () => {
    prisma.document.findFirst.mockResolvedValue({
      id: 'document_1',
      tenantId: 'tenant_1',
      mimeType: 'text/plain',
      storageKey: 'tenant_1/documents/document_1.txt',
    });

    objectStorage.getObject.mockResolvedValue({
      key: 'tenant_1/documents/document_1.txt',
      body: Buffer.from('Hello world.'),
      contentType: 'text/plain',
    });

    embeddingsService.generateEmbedding.mockResolvedValue({
      embedding: [0.1, 0.2, 0.3],
      dimensions: 1536,
      provider: 'local',
      model: 'local-deterministic-1536',
    });

    const service = new IngestionService(
      prisma as never,
      objectStorage as never,
      embeddingsService as never,
      documentTextExtractor as never,
      configService as never,
    );

    await expect(
      service.processDocument('tenant_1', 'document_1'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });

  it('rejects embeddings when dimensions do not match configured dimensions', async () => {
    configService.getOrThrow.mockReturnValue('1536');

    prisma.document.findFirst.mockResolvedValue({
      id: 'document_1',
      tenantId: 'tenant_1',
      mimeType: 'text/plain',
      storageKey: 'tenant_1/documents/document_1.txt',
    });

    objectStorage.getObject.mockResolvedValue({
      key: 'tenant_1/documents/document_1.txt',
      body: Buffer.from('Hello world.'),
      contentType: 'text/plain',
    });

    embeddingsService.generateEmbedding.mockResolvedValue({
      embedding: Array.from({ length: 256 }, () => 0.1),
      dimensions: 256,
      provider: 'openai',
      model: 'text-embedding-3-small',
    });

    const service = new IngestionService(
      prisma as never,
      objectStorage as never,
      embeddingsService as never,
      documentTextExtractor as never,
      configService as never,
    );

    await expect(
      service.processDocument('tenant_1', 'document_1'),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.$executeRaw).not.toHaveBeenCalled();
  });

  it('marks document as failed when ingestion fails', async () => {
    prisma.document.findFirst.mockResolvedValue({
      id: 'document_1',
      tenantId: 'tenant_1',
      mimeType: 'text/plain',
      storageKey: 'tenant_1/documents/document_1.txt',
    });

    objectStorage.getObject.mockResolvedValue({
      key: 'tenant_1/documents/document_1.txt',
      body: Buffer.from('Hello world.'),
      contentType: 'text/plain',
    });

    documentTextExtractor.extractText.mockRejectedValue(
      new Error('Text extraction failed'),
    );

    const service = new IngestionService(
      prisma as never,
      objectStorage as never,
      embeddingsService as never,
      documentTextExtractor as never,
      configService as never,
    );

    await expect(
      service.processDocument('tenant_1', 'document_1'),
    ).rejects.toThrow('Text extraction failed');

    expect(prisma.document.update).toHaveBeenLastCalledWith({
      where: {
        id: 'document_1',
      },
      data: {
        status: 'failed',
      },
    });
  });
});