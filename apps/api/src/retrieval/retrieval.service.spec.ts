import { RetrievalService } from './retrieval.service';

describe('RetrievalService', () => {
  const prisma = {
    $queryRaw: jest.fn(),
  };

  const embeddingsService = {
    generateEmbedding: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

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
        score: 0.12,
      },
    ]);
  });

  it('searches tenant-scoped chunks using query embedding', async () => {
    const service = new RetrievalService(
      prisma as never,
      embeddingsService as never,
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
          score: 0.12,
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
    );

    await service.search('tenant_1', {
      query: 'prueba RAG',
      limit: 999,
    });

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });
});