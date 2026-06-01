-- AlterTable
ALTER TABLE "usage_logs" ADD COLUMN     "candidateLimit" INTEGER,
ADD COLUMN     "contextTokens" INTEGER,
ADD COLUMN     "maxContextTokens" INTEGER,
ADD COLUMN     "selectedChunks" INTEGER;
