import { selectEmbeddingProvider } from './embedding-provider-selector';

describe('selectEmbeddingProvider', () => {
  const localEmbeddingProvider = {
    generateEmbedding: jest.fn(),
  };

  const openAiEmbeddingProvider = {
    generateEmbedding: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('selects the local embedding provider', () => {
    expect(
      selectEmbeddingProvider({
        providerName: 'local',
        localEmbeddingProvider: localEmbeddingProvider as never,
        openAiEmbeddingProvider: openAiEmbeddingProvider as never,
      }),
    ).toBe(localEmbeddingProvider);
  });

  it('selects the OpenAI embedding provider', () => {
    expect(
      selectEmbeddingProvider({
        providerName: 'openai',
        localEmbeddingProvider: localEmbeddingProvider as never,
        openAiEmbeddingProvider: openAiEmbeddingProvider as never,
      }),
    ).toBe(openAiEmbeddingProvider);
  });

  it('rejects unsupported embedding providers', () => {
    expect(() =>
      selectEmbeddingProvider({
        providerName: 'gemini',
        localEmbeddingProvider: localEmbeddingProvider as never,
        openAiEmbeddingProvider: openAiEmbeddingProvider as never,
      }),
    ).toThrow('Unsupported embedding provider: gemini');
  });
});