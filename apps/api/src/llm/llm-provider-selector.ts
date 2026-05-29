import { type LlmProvider } from './llm.provider';
import { type LocalLlmProvider } from './local-llm.provider';

export interface LlmProviderSelection {
  providerName: string;
  localLlmProvider: LocalLlmProvider;
}

export function selectLlmProvider(
  selection: LlmProviderSelection,
): LlmProvider {
  if (selection.providerName === 'local') {
    return selection.localLlmProvider;
  }

  throw new Error(`Unsupported LLM provider: ${selection.providerName}`);
}