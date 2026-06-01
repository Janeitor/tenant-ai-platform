import {
    BadRequestException,
    Injectable,
    ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

import {
    type GenerateAnswerInput,
    type GenerateAnswerResult,
    type LlmProvider,
    type LlmUsage,
} from './llm.provider';
import { type Response as OpenAiResponse } from 'openai/resources/responses/responses';

@Injectable()
export class OpenAiLlmProvider implements LlmProvider {
    private readonly model: string;
    private client?: OpenAI;

    constructor(
        private readonly configService: ConfigService,
        client?: OpenAI,
    ) {
        this.client = client;
        this.model = configService.get<string>('OPENAI_MODEL', 'gpt-5-mini');
    }

    async generateAnswer(
        input: GenerateAnswerInput,
    ): Promise<GenerateAnswerResult> {
        this.validateInput(input);

        try {
            const response = (await this.getClient().responses.create({
                model: this.model,
                input: this.buildInput(input),
                stream: false,
            })) as OpenAiResponse;

            return {
                answer: response.output_text,
                usage: this.buildUsage(response),
            };
        } catch {
            throw new ServiceUnavailableException('LLM provider request failed');
        }
    }

    private getClient(): OpenAI {
        this.client ??= new OpenAI({
            apiKey: this.configService.getOrThrow<string>('OPENAI_API_KEY'),
        });

        return this.client;
    }

    private validateInput(input: GenerateAnswerInput): void {
        if (input.question.trim().length === 0) {
            throw new BadRequestException('Question is required');
        }

        const hasContext = input.contexts.some(
            (contextItem) => contextItem.content.trim().length > 0,
        );

        if (!hasContext) {
            throw new BadRequestException('At least one context is required');
        }
    }

    private buildInput(input: GenerateAnswerInput): string {
        const context = input.contexts
            .map((contextItem, index) => {
                return [
                    `[${index + 1}] Document: ${contextItem.documentName}`,
                    `Chunk ID: ${contextItem.chunkId}`,
                    contextItem.content,
                ].join('\n');
            })
            .join('\n\n');

        return [
            'You are an assistant for a multi-tenant enterprise RAG platform.',
            'Answer using only the retrieved context.',
            'If the retrieved context does not contain enough information, say that the available documents do not contain enough information.',
            '',
            'Retrieved context:',
            context,
            '',
            'User question:',
            input.question,
        ].join('\n');
    }

    private buildUsage(response: OpenAiResponse): LlmUsage {
        return {
            provider: 'openai',
            model: this.model,
            inputTokens: response.usage?.input_tokens ?? null,
            outputTokens: response.usage?.output_tokens ?? null,
            totalTokens: response.usage?.total_tokens ?? null,
            estimatedCostUsd: null,
            contextTokens: null,
            selectedChunks: null,
            maxContextTokens: null,
            candidateLimit: null,
        };
    }
}
