import { Injectable } from '@nestjs/common';

export interface ContextSelectionChunk {
  chunkId: string;
  documentId: string;
  documentName: string;
  content: string;
  tokenCount?: number | null;
}

export interface SelectContextInput {
  chunks: ContextSelectionChunk[];
  maxContextTokens: number;
  candidateLimit: number;
}

export interface SelectContextResult {
  selectedChunks: ContextSelectionChunk[];
  contextTokens: number;
  selectedChunksCount: number;
  maxContextTokens: number;
  candidateLimit: number;
}

@Injectable()
export class ContextSelectionService {
  selectContext(input: SelectContextInput): SelectContextResult {
    const selectedChunks: ContextSelectionChunk[] = [];
    let contextTokens = 0;

    for (const chunk of input.chunks) {
      if (selectedChunks.length >= input.candidateLimit) {
        break;
      }

      const chunkTokens = chunk.tokenCount ?? this.estimateTokenCount(chunk.content);

      if (contextTokens + chunkTokens > input.maxContextTokens) {
        continue;
      }

      selectedChunks.push(chunk);
      contextTokens += chunkTokens;
    }

    return {
      selectedChunks,
      contextTokens,
      selectedChunksCount: selectedChunks.length,
      maxContextTokens: input.maxContextTokens,
      candidateLimit: input.candidateLimit,
    };
  }

  private estimateTokenCount(text: string): number {
    return Math.ceil(text.length / 4);
  }
}