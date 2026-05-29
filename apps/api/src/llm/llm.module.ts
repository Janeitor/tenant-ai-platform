import { Module } from '@nestjs/common';

import { LLM_PROVIDER } from './llm.provider';
import { LlmService } from './llm.service';
import { LocalLlmProvider } from './local-llm.provider';

@Module({
  providers: [
    LocalLlmProvider,
    LlmService,
    {
      provide: LLM_PROVIDER,
      useExisting: LocalLlmProvider,
    },
  ],
  exports: [LlmService],
})
export class LlmModule {}
