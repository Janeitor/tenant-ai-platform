import { ChatService } from './chat.service';

describe('ChatService', () => {
    const retrievalService = {
        search: jest.fn(),
    };

    const llmService = {
        generateAnswer: jest.fn(),
    };

    const usageService = {
        createLog: jest.fn(),
    };

    const contextSelectionService = {
        selectContext: jest.fn(),
    };

    const configService = {
        get: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        usageService.createLog.mockResolvedValue({});
        configService.get.mockImplementation(
            (_key: string, defaultValue: string) => defaultValue,
        );
    });

    it('answers using retrieved context, returns sources and logs usage', async () => {
        retrievalService.search.mockResolvedValue({
            results: [
                {
                    chunkId: 'chunk_1',
                    documentId: 'document_1',
                    documentName: 'sample-document.txt',
                    content: 'Contenido de prueba para RAG',
                    score: 0.12,
                },
            ],
        });

        contextSelectionService.selectContext.mockReturnValue({
            selectedChunks: [
                {
                    chunkId: 'chunk_1',
                    documentId: 'document_1',
                    documentName: 'sample-document.txt',
                    content: 'Contenido de prueba para RAG',
                    tokenCount: 7,
                    score: 0.12,
                },
            ],
            contextTokens: 7,
            selectedChunksCount: 1,
            maxContextTokens: 8000,
            candidateLimit: 5,
        });

        llmService.generateAnswer.mockResolvedValue({
            answer:
                'Based on the available documents: Contenido de prueba para RAG',
            usage: {
                provider: 'local',
                model: 'retrieval-only',
                inputTokens: null,
                outputTokens: null,
                totalTokens: null,
                estimatedCostUsd: null,
            },
        });

        const service = new ChatService(
            retrievalService as never,
            llmService as never,
            usageService as never,
            contextSelectionService as never,
            configService as never,
        );

        await expect(
            service.ask('tenant_1', {
                question: 'prueba RAG',
                limit: 5,
            }),
        ).resolves.toEqual({
            answer:
                'Based on the available documents: Contenido de prueba para RAG',
            sources: [
                {
                    documentId: 'document_1',
                    documentName: 'sample-document.txt',
                    chunkId: 'chunk_1',
                },
            ],
            usage: {
                provider: 'local',
                model: 'retrieval-only',
                inputTokens: null,
                outputTokens: null,
                totalTokens: null,
                estimatedCostUsd: null,
            },
        });

        expect(retrievalService.search).toHaveBeenCalledWith('tenant_1', {
            query: 'prueba RAG',
            limit: 5,
        });

        expect(llmService.generateAnswer).toHaveBeenCalledWith({
            question: 'prueba RAG',
            contexts: [
                {
                    chunkId: 'chunk_1',
                    documentId: 'document_1',
                    documentName: 'sample-document.txt',
                    content: 'Contenido de prueba para RAG',
                },
            ],
        });

        expect(usageService.createLog).toHaveBeenCalledWith({
            tenantId: 'tenant_1',
            provider: 'local',
            model: 'retrieval-only',
            inputTokens: null,
            outputTokens: null,
            totalTokens: null,
            estimatedCostUsd: null,
        });
    });

    it('returns not enough information answer and logs usage when no context is found', async () => {
        retrievalService.search.mockResolvedValue({
            results: [],
        });

        contextSelectionService.selectContext.mockReturnValue({
            selectedChunks: [],
            contextTokens: 0,
            selectedChunksCount: 0,
            maxContextTokens: 8000,
            candidateLimit: 5,
        });

        llmService.generateAnswer.mockResolvedValue({
            answer:
                'The available documents do not contain enough information to answer this question.',
            usage: {
                provider: 'local',
                model: 'retrieval-only',
                inputTokens: null,
                outputTokens: null,
                totalTokens: null,
                estimatedCostUsd: null,
            },
        });

        const service = new ChatService(
            retrievalService as never,
            llmService as never,
            usageService as never,
            contextSelectionService as never,
            configService as never,
        );
        await expect(
            service.ask('tenant_1', {
                question: 'unknown question',
            }),
        ).resolves.toEqual({
            answer:
                'No relevant context could be selected for this request.',
            sources: [],
            usage: {
                provider: 'local',
                model: 'retrieval-only',
                inputTokens: null,
                outputTokens: null,
                totalTokens: null,
                estimatedCostUsd: null,
            },
        });

        expect(retrievalService.search).toHaveBeenCalledWith('tenant_1', {
            query: 'unknown question',
            limit: 5,
        });

        expect(llmService.generateAnswer).not.toHaveBeenCalled();

        expect(usageService.createLog).toHaveBeenCalledWith({
            tenantId: 'tenant_1',
            provider: 'local',
            model: 'retrieval-only',
            inputTokens: null,
            outputTokens: null,
            totalTokens: null,
            estimatedCostUsd: null,
        });
    });

    it('caps requested limit using max chunks per query', async () => {
        retrievalService.search.mockResolvedValue({
            results: [],
        });

        contextSelectionService.selectContext.mockReturnValue({
            selectedChunks: [],
            contextTokens: 0,
            selectedChunksCount: 0,
            maxContextTokens: 8000,
            candidateLimit: 5,
        });

        const service = new ChatService(
            retrievalService as never,
            llmService as never,
            usageService as never,
            contextSelectionService as never,
            configService as never,
        );

        await service.ask('tenant_1', {
            question: 'prueba RAG',
            limit: 20,
        });

        expect(retrievalService.search).toHaveBeenCalledWith('tenant_1', {
            query: 'prueba RAG',
            limit: 5,
        });

        expect(contextSelectionService.selectContext).toHaveBeenCalledWith({
            chunks: [],
            maxContextTokens: 8000,
            candidateLimit: 5,
        });
    });

    it('uses configured context limits when available', async () => {
        configService.get.mockImplementation((key: string, defaultValue: string) => {
            if (key === 'MAX_CONTEXT_TOKENS') {
                return '12';
            }

            if (key === 'MAX_CHUNKS_PER_QUERY') {
                return '3';
            }

            return defaultValue;
        });

        retrievalService.search.mockResolvedValue({
            results: [],
        });

        contextSelectionService.selectContext.mockReturnValue({
            selectedChunks: [],
            contextTokens: 0,
            selectedChunksCount: 0,
            maxContextTokens: 12,
            candidateLimit: 3,
        });

        const service = new ChatService(
            retrievalService as never,
            llmService as never,
            usageService as never,
            contextSelectionService as never,
            configService as never,
        );

        await service.ask('tenant_1', {
            question: 'prueba RAG',
            limit: 20,
        });

        expect(retrievalService.search).toHaveBeenCalledWith('tenant_1', {
            query: 'prueba RAG',
            limit: 3,
        });

        expect(contextSelectionService.selectContext).toHaveBeenCalledWith({
            chunks: [],
            maxContextTokens: 12,
            candidateLimit: 3,
        });
    });
});
