import { Module } from '@nestjs/common';

import { ApiKeysModule } from '../api-keys/api-keys.module';
import { AuthModule } from '../auth/auth.module';
import { EmbeddingsModule } from '../embeddings/embeddings.module';
import { StorageModule } from '../storage/storage.module';
import { IngestionController } from './ingestion.controller';
import { IngestionService } from './ingestion.service';
import { DocumentTextExtractorService } from './document-text-extractor.service';

@Module({
  imports: [ApiKeysModule, AuthModule, EmbeddingsModule, StorageModule],
  controllers: [IngestionController],
  providers: [IngestionService, DocumentTextExtractorService],
})
export class IngestionModule {}
