import { ContextSelectionService } from './context-selection.service';

describe('ContextSelectionService', () => {
  it('selects chunks without exceeding max context tokens', () => {
    const service = new ContextSelectionService();

    const result = service.selectContext({
      maxContextTokens: 10,
      candidateLimit: 5,
      chunks: [
        {
          chunkId: 'chunk_1',
          documentId: 'doc_1',
          documentName: 'Doc 1',
          content: 'first',
          tokenCount: 6,
        },
        {
          chunkId: 'chunk_2',
          documentId: 'doc_1',
          documentName: 'Doc 1',
          content: 'second',
          tokenCount: 5,
        },
        {
          chunkId: 'chunk_3',
          documentId: 'doc_2',
          documentName: 'Doc 2',
          content: 'third',
          tokenCount: 4,
        },
      ],
    });

    expect(result.selectedChunks.map((chunk) => chunk.chunkId)).toEqual([
      'chunk_1',
      'chunk_3',
    ]);
    expect(result.contextTokens).toBe(10);
    expect(result.selectedChunksCount).toBe(2);
    expect(result.maxContextTokens).toBe(10);
    expect(result.candidateLimit).toBe(5);
  });

  it('respects candidate limit', () => {
    const service = new ContextSelectionService();

    const result = service.selectContext({
      maxContextTokens: 100,
      candidateLimit: 2,
      chunks: [
        {
          chunkId: 'chunk_1',
          documentId: 'doc_1',
          documentName: 'Doc 1',
          content: 'first',
          tokenCount: 1,
        },
        {
          chunkId: 'chunk_2',
          documentId: 'doc_1',
          documentName: 'Doc 1',
          content: 'second',
          tokenCount: 1,
        },
        {
          chunkId: 'chunk_3',
          documentId: 'doc_2',
          documentName: 'Doc 2',
          content: 'third',
          tokenCount: 1,
        },
      ],
    });

    expect(result.selectedChunks.map((chunk) => chunk.chunkId)).toEqual([
      'chunk_1',
      'chunk_2',
    ]);
    expect(result.selectedChunksCount).toBe(2);
  });

  it('estimates token count when tokenCount is missing', () => {
    const service = new ContextSelectionService();

    const result = service.selectContext({
      maxContextTokens: 10,
      candidateLimit: 5,
      chunks: [
        {
          chunkId: 'chunk_1',
          documentId: 'doc_1',
          documentName: 'Doc 1',
          content: '12345',
        },
      ],
    });

    expect(result.contextTokens).toBe(2);
    expect(result.selectedChunksCount).toBe(1);
  });

  it('returns empty selection when no chunk fits', () => {
    const service = new ContextSelectionService();

    const result = service.selectContext({
      maxContextTokens: 5,
      candidateLimit: 5,
      chunks: [
        {
          chunkId: 'chunk_1',
          documentId: 'doc_1',
          documentName: 'Doc 1',
          content: 'too large',
          tokenCount: 6,
        },
      ],
    });

    expect(result.selectedChunks).toEqual([]);
    expect(result.contextTokens).toBe(0);
    expect(result.selectedChunksCount).toBe(0);
  });
});