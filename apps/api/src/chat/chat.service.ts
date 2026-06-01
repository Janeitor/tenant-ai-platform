import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ContextSelectionService } from '../context/context-selection.service';

import { LlmService } from '../llm/llm.service';
import { type LlmUsage } from '../llm/llm.provider';
import { RetrievalService } from '../retrieval/retrieval.service';
import { type AskDto } from './dto/ask.dto';
import { UsageService } from '../usage/usage.service';

const DEFAULT_MAX_CONTEXT_TOKENS = 8000;
const DEFAULT_MAX_CHUNKS_PER_QUERY = 5;

export interface AskSource {
    documentId: string;
    documentName: string;
    chunkId: string;
}

export interface AskResponse {
    answer: string;
    sources: AskSource[];
    usage: LlmUsage;
}

@Injectable()
export class ChatService {
    constructor(
        private readonly retrievalService: RetrievalService,
        private readonly llmService: LlmService,
        private readonly usageService: UsageService,
        private readonly contextSelectionService: ContextSelectionService,
        private readonly configService: ConfigService,
    ) { }

    async ask(tenantId: string, askDto: AskDto): Promise<AskResponse> {
        const candidateLimit = this.getCandidateLimit(askDto.limit);
        const maxContextTokens = this.getMaxContextTokens();

        const retrieval = await this.retrievalService.search(tenantId, {
            query: askDto.question,
            limit: candidateLimit,
        });

        const contextSelection = this.contextSelectionService.selectContext({
            chunks: retrieval.results,
            maxContextTokens,
            candidateLimit,
        });

        if (contextSelection.selectedChunks.length === 0) {
            const response: AskResponse = {
                answer: 'No relevant context could be selected for this request.',
                sources: [],
                usage: this.buildUsageWithContextMetrics(
                    {
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
                    },
                    contextSelection.contextTokens,
                    contextSelection.selectedChunksCount,
                    contextSelection.maxContextTokens,
                    contextSelection.candidateLimit,
                ),
            };

            await this.usageService.createLog({
                tenantId,
                ...response.usage,
            });

            return response;
        }

        const llmResult = await this.llmService.generateAnswer({
            question: askDto.question,
            contexts: contextSelection.selectedChunks.map((result) => ({
                documentId: result.documentId,
                documentName: result.documentName,
                chunkId: result.chunkId,
                content: result.content,
            })),
        });

        const response: AskResponse = {
            answer: llmResult.answer,
            sources: contextSelection.selectedChunks.map((result) => ({
                documentId: result.documentId,
                documentName: result.documentName,
                chunkId: result.chunkId,
            })),
            usage: this.buildUsageWithContextMetrics(
                llmResult.usage,
                contextSelection.contextTokens,
                contextSelection.selectedChunksCount,
                contextSelection.maxContextTokens,
                contextSelection.candidateLimit,
            ),
        };

        await this.usageService.createLog({
            tenantId,
            ...response.usage,
        });

        return response;
    }

    private buildUsageWithContextMetrics(
        usage: LlmUsage,
        contextTokens: number,
        selectedChunks: number,
        maxContextTokens: number,
        candidateLimit: number,
    ): LlmUsage {
        return {
            ...usage,
            contextTokens,
            selectedChunks,
            maxContextTokens,
            candidateLimit,
        };
    }

    private getMaxContextTokens(): number {
        return Number(
            this.configService.get<string>(
                'MAX_CONTEXT_TOKENS',
                String(DEFAULT_MAX_CONTEXT_TOKENS),
            ),
        );
    }

    private getMaxChunksPerQuery(): number {
        return Number(
            this.configService.get<string>(
                'MAX_CHUNKS_PER_QUERY',
                String(DEFAULT_MAX_CHUNKS_PER_QUERY),
            ),
        );
    }

    private getCandidateLimit(requestedLimit?: number): number {
        const maxChunksPerQuery = this.getMaxChunksPerQuery();

        return Math.min(requestedLimit ?? maxChunksPerQuery, maxChunksPerQuery);
    }
}
