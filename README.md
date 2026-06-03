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
  client-demo/
packages/
  shared/
```

`apps/client-demo` is an example customer application. It is included in the monorepo for demonstration purposes, but it behaves like an external customer system: it calls the Tenant AI API over HTTP and keeps the tenant API key in a server-side environment variable.

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

## Client Demo

The project includes a sample customer integration app:

```txt
apps/client-demo
```

It simulates a customer portal that consumes:

```txt
POST /api/ask
```

The browser does not call Tenant AI directly. Instead, the demo uses a Next.js server route that reads:

```env
TENANT_AI_API_URL=http://localhost:3000/api
TENANT_AI_API_KEY=tai_...
```

and forwards the request to the Tenant AI API with:

```txt
x-api-key: tai_...
```

Run locally:

```bash
npm run dev --workspace @tenant-ai/client-demo
```

Then open:

```txt
http://localhost:3001
```

For customer integration details, see:

```txt
docs/api-query-integration-guide.md
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
EMBEDDING_DIMENSIONS=1536
LLM_PROVIDER_NAME=local
MAX_CONTEXT_TOKENS=8000
MAX_CHUNKS_PER_QUERY=5
MIN_RETRIEVAL_SIMILARITY=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
GEMINI_API_KEY=
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
  -> LocalEmbeddingProvider or OpenAiEmbeddingProvider
```

The active embedding provider is selected with:

```env
EMBEDDING_PROVIDER=local
```

Supported values:

```txt
local
openai
```

The local embedding provider is deterministic and does not call external AI APIs. It generates vectors with `EMBEDDING_DIMENSIONS=1536` so local development matches the production-oriented pgvector column dimension. During ingestion, each text chunk receives an embedding stored in PostgreSQL using pgvector.

The OpenAI embedding provider uses the official OpenAI SDK and the configured embedding model:

```env
EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=your-api-key
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536
```

Automated tests mock the OpenAI embedding provider and do not call the real OpenAI API.

When `EMBEDDING_PROVIDER=openai`, each ingestion request generates and stores OpenAI embeddings for document chunks. Each `/api/ask` request also generates an OpenAI embedding for the user question before running pgvector retrieval. This uses OpenAI API quota even if `LLM_PROVIDER_NAME=local`.

The database stores document chunk embeddings as:

```txt
embedding vector(1536)
```

This dimension is aligned with the planned OpenAI embedding model:

```env
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

When the embedding dimension changes, existing chunk embeddings must be regenerated. The development data created with the previous 8-dimensional local embeddings was treated as disposable test data and must not be mixed with 1536-dimensional embeddings.

Changing `EMBEDDING_PROVIDER` changes how future embeddings are generated. Existing documents should be reingested when switching from local embeddings to OpenAI embeddings so all stored vectors are generated by the same provider/model/dimension combination.

Before persisting chunk embeddings, ingestion validates that the returned vector length matches the provider-reported dimension and that both match `EMBEDDING_DIMENSIONS`. This prevents storing vectors incompatible with the configured `vector(1536)` column.

Each stored chunk also includes `tokenCount`, currently calculated with the MVP estimate:

```txt
Math.ceil(content.length / 4)
```

This value is used by the context budget selection flow before sending retrieved context to an LLM provider.

Context budget selection is implemented as an isolated service:

```txt
ContextSelectionService
  -> receives tenant-filtered retrieval chunks
  -> preserves retrieval order
  -> uses tokenCount or Math.ceil(content.length / 4)
  -> selects chunks within maxContextTokens and candidateLimit
```

This service is connected to the `/api/ask` flow. `ChatService` retrieves candidate chunks, applies context selection, and sends only selected chunks to `LlmService`.

Future Gemini embedding adapters can be added later behind the same `EmbeddingProvider` contract.

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
  -> chunks with document source metadata and tokenCount
```

Retrieval uses pgvector cosine distance through the `<=>` operator and exposes it as cosine similarity:

```txt
similarity = 1 - cosine_distance
```

Higher similarity values are more relevant.

Retrieval can optionally filter weak matches using:

```env
MIN_RETRIEVAL_SIMILARITY=
```

When this variable is empty, no similarity threshold is applied. When configured, chunks with `similarity < MIN_RETRIEVAL_SIMILARITY` are discarded before the response is returned to the caller or used by `/api/ask`.

This threshold helps reduce irrelevant sources, unnecessary context tokens and hallucination risk. The value should be chosen empirically by comparing similarity values for relevant and irrelevant questions. During local OpenAI-backed testing, `MIN_RETRIEVAL_SIMILARITY=0.5` worked as an initial development threshold, but it should not be treated as a universal production value.

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
  -> context selection
  -> LlmService
  -> local LLM provider
  -> sources
  -> usage metadata shape
```

Context selection settings:

```env
MAX_CONTEXT_TOKENS=8000
MAX_CHUNKS_PER_QUERY=5
```

If these variables are not defined, the API uses the same default values. A client may request fewer chunks with `limit`, but cannot exceed `MAX_CHUNKS_PER_QUERY`.

If no retrieved chunk fits the context budget, `/api/ask` returns a controlled response and does not call the LLM provider:

```txt
No relevant context could be selected for this request.
```

`ChatService` delegates answer generation to `LlmService`. The default development provider is local, so the `/ask` flow can run without external API keys or API cost. The project also includes an OpenAI LLM provider behind the same provider contract, so the active provider can be changed through environment configuration without coupling the chat module directly to the OpenAI SDK.

The active LLM provider is selected with:

```env
LLM_PROVIDER_NAME=local
```

Supported values:

```txt
local
openai
```

Unsupported values fail at application startup with a clear error so invalid provider configuration is detected early.

The OpenAI provider uses the official OpenAI SDK and the Responses API. To enable it locally, configure:

```env
LLM_PROVIDER_NAME=openai
OPENAI_API_KEY=your-api-key
OPENAI_MODEL=gpt-5-mini
```

`OPENAI_API_KEY` is required only when the OpenAI provider is actually used. Keeping `LLM_PROVIDER_NAME=local` allows development and automated tests to run without real OpenAI calls.

The OpenAI provider validates that the request contains a non-empty question and at least one non-empty retrieved context before calling the OpenAI API. This avoids unnecessary external calls and token usage when the RAG flow has no usable context.

For a full OpenAI-backed RAG test, use:

```env
EMBEDDING_PROVIDER=openai
LLM_PROVIDER_NAME=openai
OPENAI_API_KEY=your-api-key
OPENAI_MODEL=gpt-5-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536
```

With this configuration, `/api/ask` uses OpenAI for both query embeddings and answer generation. The endpoint returns generated answers, source references and real token usage when the provider response includes it.

For regular development without external API cost, use:

```env
EMBEDDING_PROVIDER=local
LLM_PROVIDER_NAME=local
```

Future Gemini providers should be added behind the existing `LlmProvider` contract. External provider adapters must receive only tenant-filtered context from retrieval and must not query documents or resolve tenant ownership themselves.

Current LLM abstraction:

```txt
ChatService
  -> LlmService
  -> LLM_PROVIDER token
  -> LocalLlmProvider or OpenAiLlmProvider
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
    "estimatedCostUsd": null,
    "contextTokens": 20,
    "selectedChunks": 2,
    "maxContextTokens": 8000,
    "candidateLimit": 5
  }
}
```

When no context can be selected within the configured budget, the endpoint returns a controlled response and keeps the same usage shape.

Automated tests mock external LLM providers. They must not call real OpenAI or Gemini APIs.

Each `/api/ask` request is persisted in `usage_logs` through `UsageModule`. Token and cost fields are currently stored as `null` because the local retrieval-only implementation does not call a provider that returns token usage. Context selection metrics are persisted for usage visibility.

Current usage behavior:

```txt
POST /api/ask
  -> creates usage_logs row
  -> tenantId from x-api-key
  -> provider/model from active LLM provider
  -> token fields from provider when available
  -> contextTokens, selectedChunks, maxContextTokens, candidateLimit
```

With `LLM_PROVIDER_NAME=local`, token fields are stored as `null`. With `LLM_PROVIDER_NAME=openai`, real token usage is returned and persisted when OpenAI includes usage metadata. `estimatedCostUsd` is currently stored as `null`; pricing calculation can be added later once pricing configuration is defined.

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
      "contextTokens": 20,
      "selectedChunks": 2,
      "maxContextTokens": 8000,
      "candidateLimit": 5,
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
