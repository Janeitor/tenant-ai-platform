import { Module } from '@nestjs/common';

import { ApiKeysModule } from '../api-keys/api-keys.module';
import { AuthModule } from '../auth/auth.module';
import { RetrievalModule } from '../retrieval/retrieval.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [ApiKeysModule, AuthModule, RetrievalModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}