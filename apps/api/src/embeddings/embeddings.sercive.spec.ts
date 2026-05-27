import { EmbeddingsService } from './embeddings.service';

describe('EmbeddingsService', () => {
  const embeddingProvider = {
    generateEmbedding: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('delegates embedding generation to provider', async () => {
    embeddingProvider.generateEmbedding.mockResolvedValue({
      embedding: [0.1, 0.2],
      dimensions: 2,
      provider: 'local',
      model: 'local-deterministic-2',
    });

    const service = new EmbeddingsService(embeddingProvider as never);

    await expect(service.generateEmbedding('hello world')).resolves.toEqual({
      embedding: [0.1, 0.2],
      dimensions: 2,
      provider: 'local',
      model: 'local-deterministic-2',
    });

    expect(embeddingProvider.generateEmbedding).toHaveBeenCalledWith({
      text: 'hello world',
    });
  });
});