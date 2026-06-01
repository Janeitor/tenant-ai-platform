import { type LlmProvider } from './llm.provider';
import { type LocalLlmProvider } from './local-llm.provider';
import { type OpenAiLlmProvider } from './openai-llm.provider';

export interface LlmProviderSelection {
  providerName: string;
  localLlmProvider: LocalLlmProvider;
  openAiLlmProvider: OpenAiLlmProvider;
}

export function selectLlmProvider(
  selection: LlmProviderSelection,
): LlmProvider {
  if (selection.providerName === 'local') {
    return selection.localLlmProvider;
  }

  if (selection.providerName === 'openai') {
    return selection.openAiLlmProvider;
  }

  throw new Error(`Unsupported LLM provider: ${selection.providerName}`);
}