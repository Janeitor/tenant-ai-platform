import { RetrievalService } from './retrieval.service';

describe('RetrievalService', () => {
  const prisma = {
    $queryRaw: jest.fn(),
  };

  const embeddingsService = {
    generateEmbedding: jest.fn(),
  };

  const configService = {
    get: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    configService.get.mockReturnValue(undefined);

    embeddingsService.generateEmbedding.mockResolvedValue({
      embedding: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8],
      dimensions: 8,
      provider: 'local',
      model: 'local-deterministic-8',
    });

    prisma.$queryRaw.mockResolvedValue([
      {
        chunkId: 'chunk_1',
        documentId: 'document_1',
        documentName: 'sample-document.txt',
        content: 'Contenido de prueba para RAG',
        tokenCount: 7,
        similarity: 0.12,
      },
    ]);
  });

  it('searches tenant-scoped chunks using query embedding', async () => {
    const service = new RetrievalService(
      prisma as never,
      embeddingsService as never,
      configService as never,
    );

    await expect(
      service.search('tenant_1', {
        query: 'prueba RAG',
        limit: 5,
      }),
    ).resolves.toEqual({
      results: [
        {
          chunkId: 'chunk_1',
          documentId: 'document_1',
          documentName: 'sample-document.txt',
          content: 'Contenido de prueba para RAG',
          tokenCount: 7,
          similarity: 0.12,
        },
      ],
    });

    expect(embeddingsService.generateEmbedding).toHaveBeenCalledWith(
      'prueba RAG',
    );

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('uses default limit when limit is not provided', async () => {
    const service = new RetrievalService(
      prisma as never,
      embeddingsService as never,
      configService as never,
    );

    await service.search('tenant_1', {
      query: 'prueba RAG',
    });

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('clamps limit to the maximum allowed value', async () => {
    const service = new RetrievalService(
      prisma as never,
      embeddingsService as never,
      configService as never,
    );

    await service.search('tenant_1', {
      query: 'prueba RAG',
      limit: 999,
    });

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('filters results below the configured minimum retrieval similarity', async () => {
    configService.get.mockReturnValue('0.5');

    prisma.$queryRaw.mockResolvedValue([
      {
        chunkId: 'chunk_1',
        documentId: 'document_1',
        documentName: 'Relevant.txt',
        content: 'Relevant content',
        tokenCount: 10,
        similarity: 0.85,
      },
      {
        chunkId: 'chunk_2',
        documentId: 'document_2',
        documentName: 'Irrelevant.txt',
        content: 'Irrelevant content',
        tokenCount: 10,
        similarity: 0.25,
      },
    ]);

    const service = new RetrievalService(
      prisma as never,
      embeddingsService as never,
      configService as never,
    );

    await expect(
      service.search('tenant_1', {
        query: 'test query',
        limit: 5,
      }),
    ).resolves.toEqual({
      results: [
        {
          chunkId: 'chunk_1',
          documentId: 'document_1',
          documentName: 'Relevant.txt',
          content: 'Relevant content',
          tokenCount: 10,
          similarity: 0.85,
        },
      ],
    });
  });

  it('keeps all results when minimum retrieval similarity is not configured', async () => {
    configService.get.mockReturnValue(undefined);

    prisma.$queryRaw.mockResolvedValue([
      {
        chunkId: 'chunk_1',
        documentId: 'document_1',
        documentName: 'Relevant.txt',
        content: 'Relevant content',
        tokenCount: 10,
        similarity: 0.25,
      },
      {
        chunkId: 'chunk_2',
        documentId: 'document_2',
        documentName: 'Irrelevant.txt',
        content: 'Irrelevant content',
        tokenCount: 10,
        similarity: 0.75,
      },
    ]);

    const service = new RetrievalService(
      prisma as never,
      embeddingsService as never,
      configService as never,
    );

    await expect(
      service.search('tenant_1', {
        query: 'test query',
        limit: 5,
      }),
    ).resolves.toEqual({
      results: [
        {
          chunkId: 'chunk_1',
          documentId: 'document_1',
          documentName: 'Relevant.txt',
          content: 'Relevant content',
          tokenCount: 10,
          similarity: 0.25,
        },
        {
          chunkId: 'chunk_2',
          documentId: 'document_2',
          documentName: 'Irrelevant.txt',
          content: 'Irrelevant content',
          tokenCount: 10,
          similarity: 0.75,
        },
      ],
    });
  });

  it('rejects invalid minimum retrieval similarity configuration', () => {
    configService.get.mockReturnValue('invalid');

    expect(
      () =>
        new RetrievalService(
          prisma as never,
          embeddingsService as never,
          configService as never,
        ),
    ).toThrow('MIN_RETRIEVAL_SIMILARITY must be a number between 0 and 1');
  });

  it('rejects minimum retrieval similarity greater than 1', () => {
    configService.get.mockReturnValue('1.5');

    expect(
      () =>
        new RetrievalService(
          prisma as never,
          embeddingsService as never,
          configService as never,
        ),
    ).toThrow('MIN_RETRIEVAL_SIMILARITY must be a number between 0 and 1');
  });
});