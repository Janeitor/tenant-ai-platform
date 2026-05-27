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
```

All document endpoints require:

```txt
x-api-key: tai_...
```

`POST /api/documents/upload` accepts `multipart/form-data` with a `file` field. Uploaded files are stored in the configured S3-compatible bucket using tenant-scoped object keys:

```txt
{tenantId}/documents/{timestamp}-{uuid}-{safeFileName}
```

The document row stores `storageKey` and uses `status = uploaded` after a successful object storage upload.

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
