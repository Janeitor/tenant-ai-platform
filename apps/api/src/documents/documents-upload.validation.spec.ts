import {
  isAllowedDocumentMimeType,
  MAX_DOCUMENT_UPLOAD_SIZE_BYTES,
} from './documents-upload.validation';

describe('document upload validation', () => {
  it('allows plain text documents for the current ingestion pipeline', () => {
    expect(isAllowedDocumentMimeType('text/plain')).toBe(true);
  });

  it('rejects MIME types that are not supported yet', () => {
    expect(isAllowedDocumentMimeType('application/pdf')).toBe(false);
    expect(isAllowedDocumentMimeType('image/png')).toBe(false);
  });

  it('uses a bounded upload size', () => {
    expect(MAX_DOCUMENT_UPLOAD_SIZE_BYTES).toBe(5 * 1024 * 1024);
  });
});
