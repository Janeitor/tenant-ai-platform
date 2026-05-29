import { Injectable } from '@nestjs/common';

import { LlmService } from '../llm/llm.service';
import { type LlmUsage } from '../llm/llm.provider';
import { RetrievalService } from '../retrieval/retrieval.service';
import { type AskDto } from './dto/ask.dto';
import { UsageService } from '../usage/usage.service';

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
    ) { }

    async ask(tenantId: string, askDto: AskDto): Promise<AskResponse> {
        const retrieval = await this.retrievalService.search(tenantId, {
            query: askDto.question,
            limit: askDto.limit ?? 5,
        });

        const llmResult = await this.llmService.generateAnswer({
            question: askDto.question,
            contexts: retrieval.results.map((result) => ({
                documentId: result.documentId,
                documentName: result.documentName,
                chunkId: result.chunkId,
                content: result.content,
            })),
        });

        const response: AskResponse = {
            answer: llmResult.answer,
            sources: retrieval.results.map((result) => ({
                documentId: result.documentId,
                documentName: result.documentName,
                chunkId: result.chunkId,
            })),
            usage: llmResult.usage,
        };

        await this.usageService.createLog({
            tenantId,
            ...response.usage,
        });

        return response;
    }
}
