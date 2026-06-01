import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { LLM_PROVIDER } from './llm.provider';
import { LlmService } from './llm.service';
import { LocalLlmProvider } from './local-llm.provider';
import { selectLlmProvider } from './llm-provider-selector';
import { OpenAiLlmProvider } from './openai-llm.provider';

@Module({
  providers: [
    LocalLlmProvider,
    OpenAiLlmProvider,
    LlmService,
    {
      provide: LLM_PROVIDER,
      inject: [ConfigService, LocalLlmProvider, OpenAiLlmProvider],
      useFactory: (
        configService: ConfigService,
        localLlmProvider: LocalLlmProvider,
        openAiLlmProvider: OpenAiLlmProvider,
      ) => {
        return selectLlmProvider({
          providerName: configService.getOrThrow<string>('LLM_PROVIDER_NAME'),
          localLlmProvider,
          openAiLlmProvider,
        });
      },
    },
  ],
  exports: [LlmService],
})
export class LlmModule {}
