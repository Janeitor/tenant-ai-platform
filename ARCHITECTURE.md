# Architecture

## Overview

TenantAI Platform is a multi-tenant enterprise AI platform that provides Retrieval-Augmented Generation (RAG) capabilities through an API-first architecture.

The system allows companies to:
- upload internal documents
- generate embeddings
- perform semantic search
- query knowledge using LLMs
- isolate information per tenant

---

## High-level architecture

```text
Client
  |
API Gateway
  |
Auth/API Key
  |
Tenant Resolver
  |
Retrieval Service
  |
PostgreSQL + pgvector
  |
LLM Provider
  |
Response with sources
```

---

## Backend architecture

The backend follows modular architecture using NestJS.

Modules:
- auth
- tenants
- api-keys
- documents
- ingestion
- embeddings
- retrieval
- chat
- usage

---

## Multi-tenancy strategy

Tenant isolation is enforced at database and application level.

Rules:
- every business entity includes tenantId
- all retrieval queries filter by tenantId
- API keys resolve tenant identity
- cross-tenant access is forbidden

---

## RAG pipeline

### Document ingestion

1. Upload file
2. Extract text
3. Sanitize content
4. Split into chunks
5. Generate embeddings
6. Store vectors

Current implementation supports a first ingestion phase for `text/plain` documents:

```txt
POST /api/documents/:documentId/ingest
  |
ApiKeyAuthGuard resolves tenantId
  |
IngestionService loads document by id + tenantId
  |
ObjectStoragePort reads stored object
  |
Text is split into overlapping chunks
  |
Token count is estimated per chunk
  |
LocalEmbeddingProvider generates deterministic embeddings
  |
document_chunks rows are stored with tenantId + documentId + tokenCount + embedding
  |
Document status becomes ready
```

The current embedding provider is local and deterministic. It is used to validate the pipeline without calling OpenAI or Gemini. Real provider adapters can be added behind the same embedding provider contract.

Chunk token counts are estimated during ingestion with `Math.ceil(content.length / 4)`. This MVP-friendly heuristic is intentionally simple and supports context budget control before the `/ask` flow sends retrieved chunks to an LLM provider.

Context selection is isolated in `ContextSelectionService`. It does not query the database, resolve tenants or reorder retrieval results. It receives chunks already filtered by tenant and selected by retrieval, then applies `maxContextTokens` and `candidateLimit` using stored `tokenCount` when available.

Current implementation:

```txt
EmbeddingsModule
  |
EmbeddingsService
  |
EMBEDDING_PROVIDER token
  |
LocalEmbeddingProvider
  |
pgvector embedding column on document_chunks
```

### Question answering

1. Receive user question
2. Generate embedding
3. Retrieve top-k chunks
4. Build prompt
5. Call LLM
6. Return response + sources

Current retrieval phase:

```txt
POST /api/retrieval/search
  |
ApiKeyAuthGuard resolves tenantId
  |
EmbeddingsService generates query embedding
  |
RetrievalService runs pgvector SQL search
  |
WHERE document_chunks.tenantId = authenticated tenantId
  |
Return chunk content + document source metadata
```

The current vector score uses pgvector L2 distance through the `<->` operator. Lower scores represent closer vectors. Because the current embedding provider is local and deterministic, retrieval validates architecture and tenant filtering before external embedding providers are introduced.

Current ask phase:

```txt
POST /api/ask
  |
ApiKeyAuthGuard resolves tenantId
  |
ChatService calls RetrievalService
  |
ContextSelectionService selects chunks within budget
  |
Only selected chunks become answer context
  |
ChatService calls LlmService
  |
LLM_PROVIDER resolves LocalLlmProvider
  |
Response includes answer + sources + usage shape
  |
UsageService persists usage_logs row
```

The current ask implementation is retrieval-only and does not call an external LLM yet. LLM access is isolated behind `LlmModule`, `LlmService` and the `LLM_PROVIDER` token so future OpenAI or Gemini adapters can be added without changing controller behavior or retrieval logic.

`ChatService` calculates an effective candidate limit with `Math.min(request.limit ?? MAX_CHUNKS_PER_QUERY, MAX_CHUNKS_PER_QUERY)`. It retrieves at most that many chunks, applies `ContextSelectionService`, and sends only selected chunks to the LLM provider. If no chunk fits the context budget, `ChatService` returns a controlled answer and does not call `LlmService`.

The active LLM provider is selected from configuration through `LLM_PROVIDER_NAME`. The only supported value is currently `local`; unsupported values fail at startup to avoid silently running with the wrong provider.

Current LLM implementation:

```txt
LlmModule
  |
LlmService
  |
LLM_PROVIDER token
  |
Provider selector reads LLM_PROVIDER_NAME
  |
LocalLlmProvider
```

The local provider preserves the response contract expected for the final RAG API, including sources and usage metadata with token fields set to `null` until a real LLM provider is integrated.

Future external LLM adapters must follow these rules:

- The adapter must not resolve or accept `tenantId`.
- The adapter must not query Prisma or retrieve documents.
- The adapter receives only tenant-filtered contexts prepared by retrieval.
- The adapter must build prompts using only retrieved context plus the user question.
- The adapter must not log full prompts, API keys or document contents.
- The adapter must return a consistent usage object, using `null` for token or cost values unavailable from the provider.
- Automated tests must mock external providers and must not call real OpenAI or Gemini APIs.

Future provider flow:

```txt
ChatService
  |
LlmService
  |
LLM_PROVIDER
  |
OpenAiLlmProvider or GeminiLlmProvider
  |
answer + usage
```

Usage logging is persisted from the initial implementation:

```txt
UsageModule
  |
UsageController exposes tenant-scoped reads
  |
UsageService
  |
usage_logs
  |
tenantId + provider + model + token/cost fields
```

`GET /api/usage` uses `ApiKeyAuthGuard` and reads `tenantId` from the authenticated API key. Usage logs are not queried by tenantId supplied by the client.

Usage visibility uses offset pagination with `page` and `limit`. Date filters use `YYYY-MM-DD`; when no dates are provided, the service defaults to the current calendar month. Custom ranges are capped at 90 days. The service applies tenant filtering, date filtering, `createdAt DESC` ordering, `skip/take` pagination and a matching tenant-scoped `count` query.

---

## Database

### PostgreSQL + pgvector

Main tables:
- tenants
- api_keys
- documents
- document_chunks
- conversations
- messages
- usage_logs

---

## Storage

Documents are stored using S3-compatible storage.

Development:
- MinIO

Production:
- Cloudflare R2 or AWS S3

Storage access must be isolated behind providers/adapters so business logic does not depend directly on MinIO. MinIO is the local S3-compatible implementation, not the domain abstraction.

Azure Blob Storage remains a possible future production target, but it should be introduced through a separate adapter because it does not use the S3 API natively.

Current implementation:

```txt
StorageModule
  |
OBJECT_STORAGE provider token
  |
ObjectStoragePort contract
  |
S3StorageAdapter
  |
S3-compatible storage (MinIO locally)
```

The S3 adapter uses `@aws-sdk/client-s3`. Domain services should depend on the storage contract and provider token, not directly on MinIO or a cloud-specific SDK.

The adapter verifies the configured bucket before upload and creates it automatically when it does not exist.

Document uploads currently use tenant-scoped object keys:

```txt
{tenantId}/documents/{timestamp}-{uuid}-{safeFileName}
```

After a successful upload, document metadata is persisted in PostgreSQL with `storageKey` and `status = uploaded`.

Upload validation is performed at the controller boundary before the document service is called. The current accepted MIME type is `text/plain`, with a maximum file size of 5 MB. Wider formats such as PDF should be added together with a dedicated extractor and related tests.

---

## Queue system

BullMQ + Redis are used for:
- async ingestion
- embedding generation
- future background jobs

---

## AI Providers

Supported providers:
- OpenAI
- Gemini

The provider layer must be abstracted.

---

## Security

- API key authentication
- tenant isolation
- global DTO validation with NestJS ValidationPipe
- file validation
- restricted logging
- environment variable secrets

Validation rules:

- request body DTOs use runtime validation decorators
- unknown body properties are rejected
- business endpoints must not trust tenantId from request bodies
- tenant identity is resolved from API keys

---

## Deployment

Local development:
- Docker Compose

Cloud deployment:
- Render
- Railway
- Fly.io

---

## Future improvements

- RBAC
- agents
- workflow automation
- usage billing
- Terraform automation
- ERP connectors
