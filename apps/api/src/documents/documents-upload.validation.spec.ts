import {
  isAllowedDocumentMimeType,
  MAX_DOCUMENT_UPLOAD_SIZE_BYTES,
} from './documents-upload.validation';

describe('document upload validation', () => {
  it('allows supported document MIME types', () => {
    expect(isAllowedDocumentMimeType('text/plain')).toBe(true);
    expect(isAllowedDocumentMimeType('application/pdf')).toBe(true);
  });

  it('rejects MIME types that are not supported yet', () => {
    expect(isAllowedDocumentMimeType('image/png')).toBe(false);
    expect(isAllowedDocumentMimeType('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe(false);
  });

  it('uses a bounded upload size', () => {
    expect(MAX_DOCUMENT_UPLOAD_SIZE_BYTES).toBe(5 * 1024 * 1024);
  });
});
