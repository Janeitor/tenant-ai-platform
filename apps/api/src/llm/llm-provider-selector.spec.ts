import { selectLlmProvider } from './llm-provider-selector';

describe('selectLlmProvider', () => {
  const localLlmProvider = {
    generateAnswer: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('selects the local LLM provider', () => {
    expect(
      selectLlmProvider({
        providerName: 'local',
        localLlmProvider: localLlmProvider as never,
      }),
    ).toBe(localLlmProvider);
  });

  it('rejects unsupported LLM providers', () => {
    expect(() =>
      selectLlmProvider({
        providerName: 'openai',
        localLlmProvider: localLlmProvider as never,
      }),
    ).toThrow('Unsupported LLM provider: openai');
  });
});