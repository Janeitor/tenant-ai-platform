import { ChatService } from './chat.service';

describe('ChatService', () => {
  const retrievalService = {
    search: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('answers using retrieved context and returns sources', async () => {
    retrievalService.search.mockResolvedValue({
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

    const service = new ChatService(retrievalService as never);

    await expect(
      service.ask('tenant_1', {
        question: 'prueba RAG',
        limit: 5,
      }),
    ).resolves.toEqual({
      answer:
        'Based on the available documents: Contenido de prueba para RAG',
      sources: [
        {
          documentId: 'document_1',
          documentName: 'sample-document.txt',
          chunkId: 'chunk_1',
        },
      ],
      usage: {
        provider: 'local',
        model: 'retrieval-only',
        inputTokens: null,
        outputTokens: null,
        totalTokens: null,
        estimatedCostUsd: null,
      },
    });

    expect(retrievalService.search).toHaveBeenCalledWith('tenant_1', {
      query: 'prueba RAG',
      limit: 5,
    });
  });

  it('returns not enough information answer when no context is found', async () => {
    retrievalService.search.mockResolvedValue({
      results: [],
    });

    const service = new ChatService(retrievalService as never);

    await expect(
      service.ask('tenant_1', {
        question: 'unknown question',
      }),
    ).resolves.toEqual({
      answer:
        'The available documents do not contain enough information to answer this question.',
      sources: [],
      usage: {
        provider: 'local',
        model: 'retrieval-only',
        inputTokens: null,
        outputTokens: null,
        totalTokens: null,
        estimatedCostUsd: null,
      },
    });

    expect(retrievalService.search).toHaveBeenCalledWith('tenant_1', {
      query: 'unknown question',
      limit: 5,
    });
  });
});