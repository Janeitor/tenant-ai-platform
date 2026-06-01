import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';

import { OpenAiLlmProvider } from './openai-llm.provider';

describe('OpenAiLlmProvider', () => {
    const configService = {
        get: jest.fn(),
        getOrThrow: jest.fn(),
    };

    const openAiClient = {
        responses: {
            create: jest.fn(),
        },
    };

    beforeEach(() => {
        jest.clearAllMocks();

        configService.getOrThrow.mockReturnValue('test-api-key');
        configService.get.mockImplementation(
            (_key: string, defaultValue: string) => defaultValue,
        );
    });

    it('generates an answer using OpenAI responses API and maps usage', async () => {
        openAiClient.responses.create.mockResolvedValue({
            output_text: 'Respuesta basada en documentos.',
            usage: {
                input_tokens: 100,
                output_tokens: 25,
                total_tokens: 125,
            },
        });

        const provider = new OpenAiLlmProvider(
            configService as never,
            openAiClient as never,
        );

        await expect(
            provider.generateAnswer({
                question: 'Que dice el documento?',
                contexts: [
                    {
                        documentId: 'document_1',
                        documentName: 'sample-document.txt',
                        chunkId: 'chunk_1',
                        content: 'Contenido de prueba para RAG',
                    },
                ],
            }),
        ).resolves.toEqual({
            answer: 'Respuesta basada en documentos.',
            usage: {
                provider: 'openai',
                model: 'gpt-5-mini',
                inputTokens: 100,
                outputTokens: 25,
                totalTokens: 125,
                estimatedCostUsd: null,
                contextTokens: null,
                selectedChunks: null,
                maxContextTokens: null,
                candidateLimit: null,
            },
        });

        expect(openAiClient.responses.create).toHaveBeenCalledWith({
            model: 'gpt-5-mini',
            input: expect.stringContaining('Contenido de prueba para RAG'),
            stream: false,
        });
    });

    it('uses configured OpenAI model when provided', async () => {
        configService.get.mockImplementation((key: string, defaultValue: string) => {
            if (key === 'OPENAI_MODEL') {
                return 'custom-model';
            }

            return defaultValue;
        });

        openAiClient.responses.create.mockResolvedValue({
            output_text: 'Respuesta.',
            usage: null,
        });

        const provider = new OpenAiLlmProvider(
            configService as never,
            openAiClient as never,
        );

        await provider.generateAnswer({
            question: 'Pregunta',
            contexts: [
                {
                    documentId: 'document_1',
                    documentName: 'sample-document.txt',
                    chunkId: 'chunk_1',
                    content: 'Contenido disponible',
                },
            ],
        });

        expect(openAiClient.responses.create).toHaveBeenCalledWith({
            model: 'custom-model',
            input: expect.any(String),
            stream: false,
        });
    });

    it('throws a controlled error when OpenAI request fails', async () => {
        openAiClient.responses.create.mockRejectedValue(new Error('API error'));

        const provider = new OpenAiLlmProvider(
            configService as never,
            openAiClient as never,
        );

        await expect(
            provider.generateAnswer({
                question: 'Pregunta',
                contexts: [
                    {
                        documentId: 'document_1',
                        documentName: 'sample-document.txt',
                        chunkId: 'chunk_1',
                        content: 'Contenido disponible',
                    },
                ],
            }),
        ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it('does not require OpenAI API key until a request is generated', () => {
        configService.getOrThrow.mockImplementation(() => {
            throw new Error('Missing API key');
        });

        expect(() => new OpenAiLlmProvider(configService as never)).not.toThrow();
    });

    it('does not call OpenAI when the question is empty', async () => {
        const provider = new OpenAiLlmProvider(
            configService as never,
            openAiClient as never,
        );

        await expect(
            provider.generateAnswer({
                question: '   ',
                contexts: [
                    {
                        documentId: 'document_1',
                        documentName: 'sample-document.txt',
                        chunkId: 'chunk_1',
                        content: 'Contenido disponible',
                    },
                ],
            }),
        ).rejects.toBeInstanceOf(BadRequestException);

        expect(openAiClient.responses.create).not.toHaveBeenCalled();
    });

    it('does not call OpenAI when no context content is available', async () => {
        const provider = new OpenAiLlmProvider(
            configService as never,
            openAiClient as never,
        );

        await expect(
            provider.generateAnswer({
                question: 'Pregunta',
                contexts: [
                    {
                        documentId: 'document_1',
                        documentName: 'sample-document.txt',
                        chunkId: 'chunk_1',
                        content: '   ',
                    },
                ],
            }),
        ).rejects.toBeInstanceOf(BadRequestException);

        expect(openAiClient.responses.create).not.toHaveBeenCalled();
    });
});
