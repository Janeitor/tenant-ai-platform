import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { LLM_PROVIDER } from './llm.provider';
import { LlmService } from './llm.service';
import { LocalLlmProvider } from './local-llm.provider';
import { selectLlmProvider } from './llm-provider-selector';

@Module({
  providers: [
    LocalLlmProvider,
    LlmService,
    {
      provide: LLM_PROVIDER,
      inject: [ConfigService, LocalLlmProvider],
      useFactory: (
        configService: ConfigService,
        localLlmProvider: LocalLlmProvider,
      ) => {
        return selectLlmProvider({
          providerName: configService.getOrThrow<string>('LLM_PROVIDER_NAME'),
          localLlmProvider,
        });
      },
    },
  ],
  exports: [LlmService],
})
export class LlmModule {}
