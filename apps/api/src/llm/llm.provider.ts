export interface LlmSourceContext {
  documentId: string;
  documentName: string;
  chunkId: string;
  content: string;
}

export interface GenerateAnswerInput {
  question: string;
  contexts: LlmSourceContext[];
}

export interface LlmUsage {
  provider: string;
  model: string;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  estimatedCostUsd: number | null;
}

export interface GenerateAnswerResult {
  answer: string;
  usage: LlmUsage;
}

export interface LlmProvider {
  generateAnswer(input: GenerateAnswerInput): Promise<GenerateAnswerResult>;
}

export const LLM_PROVIDER = Symbol('LLM_PROVIDER');
