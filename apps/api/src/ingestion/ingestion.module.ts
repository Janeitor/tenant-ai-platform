import { Module } from '@nestjs/common';

import { ApiKeysModule } from '../api-keys/api-keys.module';
import { AuthModule } from '../auth/auth.module';
import { EmbeddingsModule } from '../embeddings/embeddings.module';
import { StorageModule } from '../storage/storage.module';
import { IngestionController } from './ingestion.controller';
import { IngestionService } from './ingestion.service';

@Module({
  imports: [ApiKeysModule, AuthModule, EmbeddingsModule, StorageModule],
  controllers: [IngestionController],
  providers: [IngestionService],
})
export class IngestionModule {}
