import { LocalLlmProvider } from './local-llm.provider';

describe('LocalLlmProvider', () => {
  it('answers from the first retrieved context and returns local usage metadata', async () => {
    const provider = new LocalLlmProvider();

    await expect(
      provider.generateAnswer({
        question: 'prueba RAG',
        contexts: [
          {
            documentId: 'document_1',
            documentName: 'sample-document.txt',
            chunkId: 'chunk_1',
            content: 'Contenido de prueba para RAG',
          },
        ],
      }),
    ).resolves.toEqual({
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
  });

  it('returns the no-context answer when there are no retrieved chunks', async () => {
    const provider = new LocalLlmProvider();

    await expect(
      provider.generateAnswer({
        question: 'unknown question',
        contexts: [],
      }),
    ).resolves.toMatchObject({
      answer:
        'The available documents do not contain enough information to answer this question.',
      usage: {
        provider: 'local',
        model: 'retrieval-only',
      },
    });
  });
});
