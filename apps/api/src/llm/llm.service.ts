import { Inject, Injectable } from '@nestjs/common';

import {
  LLM_PROVIDER,
  type GenerateAnswerInput,
  type GenerateAnswerResult,
  type LlmProvider,
} from './llm.provider';

@Injectable()
export class LlmService {
  constructor(
    @Inject(LLM_PROVIDER)
    private readonly llmProvider: LlmProvider,
  ) {}

  generateAnswer(input: GenerateAnswerInput): Promise<GenerateAnswerResult> {
    return this.llmProvider.generateAnswer(input);
  }
}
