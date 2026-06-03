import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { EMBEDDING_PROVIDER } from './embeddings.provider';
import { EmbeddingsService } from './embeddings.service';
import { selectEmbeddingProvider } from './embedding-provider-selector';
import { LocalEmbeddingProvider } from './local-embedding.provider';
import { OpenAiEmbeddingProvider } from './openai-embedding.provider';

@Module({
  providers: [
    LocalEmbeddingProvider,
    OpenAiEmbeddingProvider,
    EmbeddingsService,
    {
      provide: EMBEDDING_PROVIDER,
      inject: [ConfigService, LocalEmbeddingProvider, OpenAiEmbeddingProvider],
      useFactory: (
        configService: ConfigService,
        localEmbeddingProvider: LocalEmbeddingProvider,
        openAiEmbeddingProvider: OpenAiEmbeddingProvider,
      ) =>
        selectEmbeddingProvider({
          providerName: configService.getOrThrow<string>('EMBEDDING_PROVIDER'),
          localEmbeddingProvider,
          openAiEmbeddingProvider,
        }),
    },
  ],
  exports: [EmbeddingsService],
})
export class EmbeddingsModule {}