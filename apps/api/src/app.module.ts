import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import path from 'node:path';

import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { TenantsModule } from './tenants/tenants.module';
import { ApiKeysModule } from './api-keys/api-keys.module';
import { AuthModule } from './auth/auth.module';
import { DocumentsModule } from './documents/documents.module';
import { StorageModule } from './storage/storage.module';
import { IngestionModule } from './ingestion/ingestion.module';
import { EmbeddingsModule } from './embeddings/embeddings.module';
import { RetrievalModule } from './retrieval/retrieval.module';
import { ChatModule } from './chat/chat.module';

const rootEnvPath = path.resolve(process.cwd(), '../../.env');
const rootLocalEnvPath = path.resolve(process.cwd(), '../../.env.local');

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [rootLocalEnvPath, rootEnvPath],
    }),
    PrismaModule,
    HealthModule,
    TenantsModule,
    ApiKeysModule,
    AuthModule,
    DocumentsModule,
    StorageModule,
    IngestionModule,
    EmbeddingsModule,
    RetrievalModule,
    ChatModule,
  ],
})
export class AppModule {}
