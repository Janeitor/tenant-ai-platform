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
document_chunks rows are stored with tenantId + documentId
  |
Document status becomes ready
```

Embeddings and vector storage are planned next; the current phase stores plain text chunks only.

### Question answering

1. Receive user question
2. Generate embedding
3. Retrieve top-k chunks
4. Build prompt
5. Call LLM
6. Return response + sources

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
- file validation
- restricted logging
- environment variable secrets

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
