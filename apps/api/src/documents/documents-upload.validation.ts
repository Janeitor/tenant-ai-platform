export const MAX_DOCUMENT_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;

export const ALLOWED_DOCUMENT_MIME_TYPES = [
  'text/plain',
  'application/pdf',
] as const;

export function isAllowedDocumentMimeType(mimeType: string): boolean {
  return ALLOWED_DOCUMENT_MIME_TYPES.includes(
    mimeType as (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number],
  );
}
