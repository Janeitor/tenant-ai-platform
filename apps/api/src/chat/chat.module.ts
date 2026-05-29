import { Module } from '@nestjs/common';

import { ApiKeysModule } from '../api-keys/api-keys.module';
import { AuthModule } from '../auth/auth.module';
import { RetrievalModule } from '../retrieval/retrieval.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { UsageModule } from '../usage/usage.module';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [ApiKeysModule, AuthModule, RetrievalModule, UsageModule, LlmModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
