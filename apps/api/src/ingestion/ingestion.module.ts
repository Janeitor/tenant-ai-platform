import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';

import { ApiKeysModule } from '../api-keys/api-keys.module';
import { AuthModule } from '../auth/auth.module';
import { EmbeddingsModule } from '../embeddings/embeddings.module';
import { StorageModule } from '../storage/storage.module';
import { IngestionController } from './ingestion.controller';
import { IngestionService } from './ingestion.service';
import { DocumentTextExtractorService } from './document-text-extractor.service';
import { IngestionQueueService } from './ingestion-queue.service';
import { IngestionProcessor } from './ingestion.processor';


@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: Number(configService.get<string>('REDIS_PORT', '6379')),
          password: configService.get<string>('REDIS_PASSWORD') || undefined,
        },
      }),
    }),
    BullModule.registerQueue({
      name: 'document-ingestion',
    }),
    ApiKeysModule,
    AuthModule,
    EmbeddingsModule,
    StorageModule,
  ],
  controllers: [IngestionController],
  providers: [
    IngestionService,
    IngestionQueueService,
    IngestionProcessor,
    DocumentTextExtractorService,
  ],
  exports: [IngestionService, IngestionQueueService],
})
export class IngestionModule { }
