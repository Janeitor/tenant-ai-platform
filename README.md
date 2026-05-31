# TFM Multitenant RAG

Multi-tenant enterprise AI platform that exposes a RAG API for companies to query internal documents without managing AI infrastructure.

## Product Goal

Build a production-oriented platform with:
- API-first design
- multi-tenant isolation
- secure document processing
- retrieval with tenant filtering
- responses with sources
- token usage visibility
- maintainable architecture and automated tests

The initial deliverable is not a throwaway prototype. Implemented features should follow the architecture, security and maintainability standards expected from the final product.

## Required Tools

- Node.js 22 LTS
- npm
- Git
- Docker Desktop with Docker Compose

Recommended local alignment:

```bash
node -v
npm -v
git --version
docker compose version
```

The project should use the same Node.js major version locally, in Docker and in GitHub Actions.

Currently tested with:

```txt
Node.js v22.22.3
npm 10.9.8
```

## Planned Tech Stack

- Backend: NestJS + TypeScript
- Database: PostgreSQL + pgvector
- ORM: Prisma
- AI providers: OpenAI SDK and/or Gemini SDK
- Queue: BullMQ + Redis
- Storage: S3-compatible storage
- Frontend: Next.js
- Tests: Jest + Supertest
- Docker: Docker Compose for local development
- CI/CD: GitHub Actions

## Planned Project Structure

```txt
apps/
  api/
  web/
packages/
  shared/
```

## Local Setup

Install dependencies:

```bash
npm install
```

Create a local environment file from the example:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Run project checks:

```bash
npm run lint
npm run test
npm run build
```

## API Validation

The API uses NestJS `ValidationPipe` with DTO classes and `class-validator` decorators to validate JSON request bodies at runtime.

Global validation settings:

```txt
whitelist: true
forbidNonWhitelisted: true
transform: true
```

This means:

- fields not declared in DTOs are rejected with `400 Bad Request`
- required fields such as `question` are validated before reaching controllers/services
- protected business endpoints reject client-supplied fields such as `tenantId` when they are not part of the DTO

Tenant identity must come from authenticated credentials such as `x-api-key`, not from request bodies.

## Local Infrastructure

The project uses Docker Compose for local infrastructure services:

- PostgreSQL with pgvector on port `5432`
- Redis on port `6379`
- MinIO S3-compatible storage on ports `9000` and `9001`

Start services:

```bash
docker compose up -d
```

Check service status:

```bash
docker compose ps
```

Stop services:

```bash
docker compose down
```

MinIO console:

```txt
http://localhost:9001
user: minioadmin
password: minioadmin
```

Default local service URLs:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tenant_ai?schema=public
REDIS_URL=redis://localhost:6379
S3_ENDPOINT=http://localhost:9000
API_KEY_PEPPER=change-me-in-local-env
EMBEDDING_PROVIDER=local
EMBEDDING_DIMENSIONS=8
LLM_PROVIDER_NAME=local
```

## Storage Decision

Local document storage uses MinIO because it provides an S3-compatible API for development. The application should keep storage access behind a provider/adapter boundary instead of coupling business logic directly to MinIO.

Planned storage direction:

```txt
Local development: MinIO
Primary cloud-compatible path: S3-compatible storage such as AWS S3 or Cloudflare R2
Future Azure option: Azure Blob Storage through a separate adapter if deployment requirements change
```

Storage-related services should use neutral names such as `StorageService`, `ObjectStorageService` or `S3StorageAdapter`, not domain logic tied directly to MinIO.

Implemented storage abstraction:

```txt
apps/api/src/storage/object-storage.types.ts
apps/api/src/storage/object-storage.service.ts
apps/api/src/storage/s3-storage.adapter.ts
apps/api/src/storage/storage.module.ts
```

The API uses `@aws-sdk/client-s3` to communicate with S3-compatible storage. In local development, this points to MinIO through the `S3_*` environment variables.

Application services should depend on the `OBJECT_STORAGE` provider token and the `ObjectStoragePort` contract instead of depending directly on `S3StorageAdapter`.

The S3 adapter verifies the configured bucket before upload and creates it automatically when it does not exist.

Current document endpoints:

```txt
POST /api/documents
GET /api/documents
POST /api/documents/upload
POST /api/documents/:documentId/ingest
```

All document endpoints require:

```txt
x-api-key: tai_...
```

`POST /api/documents/upload` accepts `multipart/form-data` with a `file` field. Upload validation currently allows only `text/plain` documents and limits each file to 5 MB. This matches the current ingestion pipeline, which extracts UTF-8 text from plain text files before chunking.

Uploaded files are stored in the configured S3-compatible bucket using tenant-scoped object keys:

```txt
{tenantId}/documents/{timestamp}-{uuid}-{safeFileName}
```

The document row stores `storageKey` and uses `status = uploaded` after a successful object storage upload.

Basic ingestion currently supports `text/plain` documents. The ingestion endpoint reads the stored object through the storage abstraction, extracts UTF-8 text, splits it into overlapping chunks, estimates a token count per chunk, stores them in `document_chunks`, and updates the document to `status = ready`.

Current ingestion behavior:

```txt
POST /api/documents/:documentId/ingest
  -> requires x-api-key
  -> filters document by authenticated tenantId
  -> supports text/plain only
  -> creates document_chunks
  -> stores tokenCount using Math.ceil(content.length / 4)
  -> marks document as ready
```

Current embedding behavior:

```txt
EmbeddingsModule
  -> EmbeddingsService
  -> EMBEDDING_PROVIDER token
  -> LocalEmbeddingProvider
```

The local embedding provider is deterministic and does not call external AI APIs. It generates vectors with `EMBEDDING_DIMENSIONS=8` for development and tests. During ingestion, each text chunk receives an embedding stored in PostgreSQL using pgvector.

Each stored chunk also includes `tokenCount`, currently calculated with the MVP estimate:

```txt
Math.ceil(content.length / 4)
```

This value will be used by the context budget selection flow before sending retrieved context to an LLM provider.

Provider adapters for OpenAI or Gemini can be added later behind the same `EmbeddingProvider` contract.

Current retrieval endpoint:

```txt
POST /api/retrieval/search
```

Request body:

```json
{
  "query": "prueba RAG",
  "limit": 5
}
```

The endpoint requires:

```txt
x-api-key: tai_...
```

Retrieval behavior:

```txt
query text
  -> local embedding
  -> pgvector similarity search
  -> tenantId filter from API key
  -> chunks with document source metadata
```

The current score is pgvector L2 distance using the `<->` operator. Lower scores mean closer vectors. With the local deterministic provider, ranking validates the technical pipeline but does not yet represent production semantic quality.

Current ask endpoint:

```txt
POST /api/ask
```

Request body:

```json
{
  "question": "prueba RAG",
  "limit": 5
}
```

The endpoint requires:

```txt
x-api-key: tai_...
```

Current ask behavior:

```txt
question
  -> tenant-scoped retrieval
  -> LlmService
  -> local LLM provider
  -> sources
  -> usage metadata shape
```

The current implementation does not call an external LLM. `ChatService` delegates answer generation to `LlmService`, which currently uses a local provider. This keeps the `/ask` flow ready for future OpenAI or Gemini adapters without coupling the chat module directly to a specific SDK.

The active LLM provider is selected with:

```env
LLM_PROVIDER_NAME=local
```

Only `local` is currently supported. Unsupported values fail at application startup with a clear error so invalid provider configuration is detected early.

Future OpenAI or Gemini providers should be added behind the existing `LlmProvider` contract. External provider adapters must receive only tenant-filtered context from retrieval and must not query documents or resolve tenant ownership themselves.

Current LLM abstraction:

```txt
ChatService
  -> LlmService
  -> LLM_PROVIDER token
  -> LocalLlmProvider
```

The local provider returns an answer based on retrieved context and preserves the final response shape expected by the product:

```json
{
  "answer": "Based on the available documents: ...",
  "sources": [
    {
      "documentId": "...",
      "documentName": "sample-document.txt",
      "chunkId": "..."
    }
  ],
  "usage": {
    "provider": "local",
    "model": "retrieval-only",
    "inputTokens": null,
    "outputTokens": null,
    "totalTokens": null,
    "estimatedCostUsd": null
  }
}
```

When no context is found, the endpoint states that the available documents do not contain enough information.

Each `/api/ask` request is persisted in `usage_logs` through `UsageModule`. Token and cost fields are currently stored as `null` because the local retrieval-only implementation does not call a provider that returns token usage.

Current usage behavior:

```txt
POST /api/ask
  -> creates usage_logs row
  -> tenantId from x-api-key
  -> provider = local
  -> model = retrieval-only
  -> token fields = null
```

Current usage visibility endpoint:

```txt
GET /api/usage?page=1&limit=50&startDate=2026-05-01&endDate=2026-05-29
```

The endpoint requires:

```txt
x-api-key: tai_...
```

It returns usage logs for the authenticated tenant only. The client does not send `tenantId`; the API resolves it from the API key.

Query parameters:

```txt
page      optional, default 1
limit     optional, default 50, max 100
startDate optional, YYYY-MM-DD
endDate   optional, YYYY-MM-DD
```

If `startDate` and `endDate` are omitted, the endpoint uses the current calendar month. If one date is provided, the other one is required. The maximum custom date range is 90 days.

Example response:

```json
{
  "data": [
    {
      "id": "...",
      "tenantId": "...",
      "provider": "local",
      "model": "retrieval-only",
      "inputTokens": null,
      "outputTokens": null,
      "totalTokens": null,
      "estimatedCostUsd": null,
      "createdAt": "2026-05-29T02:05:07.486Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1,
    "totalPages": 1
  },
  "filters": {
    "startDate": "2026-05-01",
    "endDate": "2026-05-31"
  }
}
```

## Database And Prisma

The API uses Prisma ORM with PostgreSQL. This project currently uses Prisma 7, which keeps the database URL in `apps/api/prisma.config.ts` instead of inside `schema.prisma`.

Important files:

```txt
apps/api/prisma/schema.prisma
apps/api/prisma.config.ts
apps/api/prisma/migrations/
apps/api/src/prisma/prisma.module.ts
apps/api/src/prisma/prisma.service.ts
```

Apply local migrations:

```bash
npm run prisma:migrate --workspace @tenant-ai/api -- --name init
```

Generate the Prisma client:

```bash
npm run prisma:generate --workspace @tenant-ai/api
```

Open Prisma Studio:

```bash
npm run prisma:studio --workspace @tenant-ai/api
```

Prisma client output is generated in `apps/api/generated/prisma` and is intentionally ignored by Git. It can be regenerated from `schema.prisma`.

Current initial models:

```txt
Tenant
ApiKey
Document
DocumentChunk
UsageLog
```

The `tenants` table is the base entity for multi-tenant isolation. Future business entities such as API keys, documents, chunks, conversations and usage logs must include `tenantId`.

## API Key Authentication

API keys are tenant-scoped credentials used to authenticate future business endpoints such as document upload, retrieval, chat and usage visibility.

Create an API key for a tenant:

```txt
POST /api/tenants/:tenantId/api-keys
```

List API keys for a tenant:

```txt
GET /api/tenants/:tenantId/api-keys
```

The raw API key is returned only once during creation. The database stores:

- `keyHash`: HMAC-SHA256 hash using `API_KEY_PEPPER`
- `keyPrefix`: short visible prefix for identification
- `tenantId`: owner tenant
- `revokedAt`: nullable revocation timestamp

Protected endpoints will receive API keys through this header:

```txt
x-api-key: tai_...
```

`ApiKeyAuthGuard` validates the header, resolves the owning tenant and attaches authenticated API key metadata to the request. Business endpoints must use the tenant resolved from the API key instead of trusting `tenantId` from request bodies.

## Vulnerability Tracking

Development vulnerability findings are documented in:

```txt
docs/vulnerability-analysis.md
```

This includes the current `npm audit` finding related to Prisma development tooling and the rationale for monitoring it instead of applying a breaking automatic downgrade.

## Documentation Status

This README will be updated as setup, environment variables, API endpoints and deployment instructions are defined.
