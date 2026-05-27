-- This is an empty migration.
CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE "document_chunks"
ADD COLUMN "embedding" vector(8);
