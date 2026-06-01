import { selectLlmProvider } from './llm-provider-selector';

describe('selectLlmProvider', () => {
    const localLlmProvider = {
        generateAnswer: jest.fn(),
    };

    const openAiLlmProvider = {
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
                openAiLlmProvider: openAiLlmProvider as never,
            }),
        ).toBe(localLlmProvider);
    });

    it('selects the OpenAI LLM provider', () => {
        expect(
            selectLlmProvider({
                providerName: 'openai',
                localLlmProvider: localLlmProvider as never,
                openAiLlmProvider: openAiLlmProvider as never,
            }),
        ).toBe(openAiLlmProvider);
    });

    it('rejects unsupported LLM providers', () => {
        expect(() =>
            selectLlmProvider({
                providerName: 'gemini',
                localLlmProvider: localLlmProvider as never,
                openAiLlmProvider: openAiLlmProvider as never,
            }),
        ).toThrow('Unsupported LLM provider: gemini');
    });
});