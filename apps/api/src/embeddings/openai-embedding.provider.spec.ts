import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';

import { OpenAiEmbeddingProvider } from './openai-embedding.provider';

describe('OpenAiEmbeddingProvider', () => {
  const configService = {
    get: jest.fn(),
    getOrThrow: jest.fn(),
  };

  const openAiClient = {
    embeddings: {
      create: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    configService.getOrThrow.mockReturnValue('test-api-key');
    configService.get.mockImplementation(
      (_key: string, defaultValue: string) => defaultValue,
    );
  });

  it('generates an embedding using OpenAI embeddings API', async () => {
    openAiClient.embeddings.create.mockResolvedValue({
      data: [
        {
          embedding: [0.1, 0.2, 0.3],
        },
      ],
    });

    const provider = new OpenAiEmbeddingProvider(configService as never);
    provider.setClientForTesting(openAiClient as never);

    await expect(
      provider.generateEmbedding({
        text: 'Texto de prueba',
      }),
    ).resolves.toEqual({
      embedding: [0.1, 0.2, 0.3],
      dimensions: 3,
      provider: 'openai',
      model: 'text-embedding-3-small',
    });

    expect(openAiClient.embeddings.create).toHaveBeenCalledWith({
      model: 'text-embedding-3-small',
      input: 'Texto de prueba',
      dimensions: 1536,
    });
  });

  it('uses configured OpenAI embedding model and dimensions', async () => {
    configService.get.mockImplementation((key: string, defaultValue: string) => {
      if (key === 'OPENAI_EMBEDDING_MODEL') {
        return 'custom-embedding-model';
      }

      if (key === 'EMBEDDING_DIMENSIONS') {
        return '256';
      }

      return defaultValue;
    });

    openAiClient.embeddings.create.mockResolvedValue({
      data: [
        {
          embedding: [0.1, 0.2],
        },
      ],
    });

    const provider = new OpenAiEmbeddingProvider(configService as never);
    provider.setClientForTesting(openAiClient as never);

    await provider.generateEmbedding({
      text: 'Texto de prueba',
    });

    expect(openAiClient.embeddings.create).toHaveBeenCalledWith({
      model: 'custom-embedding-model',
      input: 'Texto de prueba',
      dimensions: 256,
    });
  });

  it('does not require OpenAI API key until a request is generated', () => {
    configService.getOrThrow.mockImplementation(() => {
      throw new Error('Missing API key');
    });

    expect(() => new OpenAiEmbeddingProvider(configService as never)).not.toThrow();
  });

  it('does not call OpenAI when text is empty', async () => {
    const provider = new OpenAiEmbeddingProvider(configService as never);
    provider.setClientForTesting(openAiClient as never);

    await expect(
      provider.generateEmbedding({
        text: '   ',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(openAiClient.embeddings.create).not.toHaveBeenCalled();
  });

  it('throws a controlled error when OpenAI request fails', async () => {
    openAiClient.embeddings.create.mockRejectedValue(new Error('API error'));

    const provider = new OpenAiEmbeddingProvider(configService as never);
    provider.setClientForTesting(openAiClient as never);

    await expect(
      provider.generateEmbedding({
        text: 'Texto de prueba',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('throws a controlled error when OpenAI returns no embedding data', async () => {
    openAiClient.embeddings.create.mockResolvedValue({
      data: [],
    });

    const provider = new OpenAiEmbeddingProvider(configService as never);
    provider.setClientForTesting(openAiClient as never);

    await expect(
      provider.generateEmbedding({
        text: 'Texto de prueba',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});