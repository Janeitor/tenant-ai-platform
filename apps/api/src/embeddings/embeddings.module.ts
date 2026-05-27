import { Module } from '@nestjs/common';

import { EMBEDDING_PROVIDER } from './embeddings.provider';
import { EmbeddingsService } from './embeddings.service';
import { LocalEmbeddingProvider } from './local-embedding.provider';

@Module({
  providers: [
    LocalEmbeddingProvider,
    EmbeddingsService,
    {
      provide: EMBEDDING_PROVIDER,
      useExisting: LocalEmbeddingProvider,
    },
  ],
  exports: [EmbeddingsService],
})
export class EmbeddingsModule {}