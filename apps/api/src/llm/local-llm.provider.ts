import { Injectable } from '@nestjs/common';

import {
  type GenerateAnswerInput,
  type GenerateAnswerResult,
  type LlmProvider,
  type LlmUsage,
} from './llm.provider';

@Injectable()
export class LocalLlmProvider implements LlmProvider {
  async generateAnswer(
    input: GenerateAnswerInput,
  ): Promise<GenerateAnswerResult> {
    if (input.contexts.length === 0) {
      return {
        answer:
          'The available documents do not contain enough information to answer this question.',
        usage: this.buildUsage(),
      };
    }

    const [topContext] = input.contexts;

    return {
      answer: `Based on the available documents: ${topContext.content}`,
      usage: this.buildUsage(),
    };
  }

    private buildUsage(): LlmUsage {
    return {
      provider: 'local',
      model: 'retrieval-only',
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
      estimatedCostUsd: null,
      contextTokens: null,
      selectedChunks: null,
      maxContextTokens: null,
      candidateLimit: null,
    };
  }
}
