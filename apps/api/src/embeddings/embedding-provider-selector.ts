import { type EmbeddingProvider } from './embeddings.provider';
import { type LocalEmbeddingProvider } from './local-embedding.provider';
import { type OpenAiEmbeddingProvider } from './openai-embedding.provider';

export interface EmbeddingProviderSelection {
  providerName: string;
  localEmbeddingProvider: LocalEmbeddingProvider;
  openAiEmbeddingProvider: OpenAiEmbeddingProvider;
}

export function selectEmbeddingProvider(
  selection: EmbeddingProviderSelection,
): EmbeddingProvider {
  if (selection.providerName === 'local') {
    return selection.localEmbeddingProvider;
  }

  if (selection.providerName === 'openai') {
    return selection.openAiEmbeddingProvider;
  }

  throw new Error(`Unsupported embedding provider: ${selection.providerName}`);
}