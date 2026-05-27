import { LocalEmbeddingProvider } from './local-embedding.provider';

describe('LocalEmbeddingProvider', () => {
  const configService = {
    getOrThrow: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    configService.getOrThrow.mockReturnValue('8');
  });

  it('generates deterministic embeddings with configured dimensions', async () => {
    const provider = new LocalEmbeddingProvider(configService as never);

    const first = await provider.generateEmbedding({ text: 'hello world' });
    const second = await provider.generateEmbedding({ text: 'hello world' });

    expect(first).toEqual(second);
    expect(first.dimensions).toBe(8);
    expect(first.embedding).toHaveLength(8);
    expect(first.provider).toBe('local');
    expect(first.model).toBe('local-deterministic-8');
  });

  it('generates different embeddings for different text', async () => {
    const provider = new LocalEmbeddingProvider(configService as never);

    const first = await provider.generateEmbedding({ text: 'hello world' });
    const second = await provider.generateEmbedding({ text: 'other text' });

    expect(first.embedding).not.toEqual(second.embedding);
  });
});