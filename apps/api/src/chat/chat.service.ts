import { Injectable } from '@nestjs/common';

import { RetrievalService } from '../retrieval/retrieval.service';
import { type AskDto } from './dto/ask.dto';

export interface AskSource {
  documentId: string;
  documentName: string;
  chunkId: string;
}

export interface AskUsage {
  provider: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  estimatedCostUsd: number | null;
}

export interface AskResponse {
  answer: string;
  sources: AskSource[];
  usage: AskUsage;
}

@Injectable()
export class ChatService {
  constructor(private readonly retrievalService: RetrievalService) {}

  async ask(tenantId: string, askDto: AskDto): Promise<AskResponse> {
    const retrieval = await this.retrievalService.search(tenantId, {
      query: askDto.question,
      limit: askDto.limit ?? 5,
    });

    if (retrieval.results.length === 0) {
      return {
        answer:
          'The available documents do not contain enough information to answer this question.',
        sources: [],
        usage: this.buildLocalUsage(),
      };
    }

    const [topResult] = retrieval.results;

    return {
      answer: `Based on the available documents: ${topResult.content}`,
      sources: retrieval.results.map((result) => ({
        documentId: result.documentId,
        documentName: result.documentName,
        chunkId: result.chunkId,
      })),
      usage: this.buildLocalUsage(),
    };
  }

  private buildLocalUsage(): AskUsage {
    return {
      provider: 'local',
      model: 'retrieval-only',
      inputTokens: null,
      outputTokens: null,
      totalTokens: null,
      estimatedCostUsd: null,
    };
  }
}