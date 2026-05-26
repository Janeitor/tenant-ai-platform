import { Module } from '@nestjs/common';

import { ApiKeysModule } from '../api-keys/api-keys.module';
import { ApiKeyAuthGuard } from './api-key-auth.guard';

@Module({
  imports: [ApiKeysModule],
  providers: [ApiKeyAuthGuard],
  exports: [ApiKeyAuthGuard],
})
export class AuthModule {}