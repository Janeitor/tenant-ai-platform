import { estimateTokenCount } from './token-count';

describe('estimateTokenCount', () => {
  it('estimates tokens using the MVP character heuristic', () => {
    expect(estimateTokenCount('1234')).toBe(1);
    expect(estimateTokenCount('12345')).toBe(2);
    expect(estimateTokenCount('Hello world. This is a test document.')).toBe(10);
  });

  it('returns zero for empty text', () => {
    expect(estimateTokenCount('')).toBe(0);
  });
});