import { ChatService } from './chat.service';

describe('ChatService', () => {
  const retrievalService = {
    search: jest.fn(),
  };

  const llmService = {
    generateAnswer: jest.fn(),
  };

  const usageService = {
    createLog: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    usageService.createLog.mockResolvedValue({});
  });

  it('answers using retrieved context, returns sources and logs usage', async () => {
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
    llmService.generateAnswer.mockResolvedValue({
      answer:
        'Based on the available documents: Contenido de prueba para RAG',
      usage: {
        provider: 'local',
        model: 'retrieval-only',
        inputTokens: null,
        outputTokens: null,
        totalTokens: null,
        estimatedCostUsd: null,
      },
    });

    const service = new ChatService(
      retrievalService as never,
      llmService as never,
      usageService as never,
    );

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

    expect(llmService.generateAnswer).toHaveBeenCalledWith({
      question: 'prueba RAG',
      contexts: [
        {
          chunkId: 'chunk_1',
          documentId: 'document_1',
          documentName: 'sample-document.txt',
          content: 'Contenido de prueba para RAG',
        },
      ],
    });

    expect(usageService.createLog).toHaveBeenCalledWith({
      tenantId: 'tenant_1',
      provider: 'local',
      model: 'retrieval-only',
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
      estimatedCostUsd: null,
    });
  });

  it('returns not enough information answer and logs usage when no context is found', async () => {
    retrievalService.search.mockResolvedValue({
      results: [],
    });
    llmService.generateAnswer.mockResolvedValue({
      answer:
        'The available documents do not contain enough information to answer this question.',
      usage: {
        provider: 'local',
        model: 'retrieval-only',
        inputTokens: null,
        outputTokens: null,
        totalTokens: null,
        estimatedCostUsd: null,
      },
    });

    const service = new ChatService(
      retrievalService as never,
      llmService as never,
      usageService as never,
    );

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

    expect(llmService.generateAnswer).toHaveBeenCalledWith({
      question: 'unknown question',
      contexts: [],
    });

    expect(usageService.createLog).toHaveBeenCalledWith({
      tenantId: 'tenant_1',
      provider: 'local',
      model: 'retrieval-only',
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
      estimatedCostUsd: null,
    });
  });
});
