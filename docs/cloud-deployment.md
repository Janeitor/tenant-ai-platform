# Cloud Deployment

This document describes the current MVP cloud deployment validated for the Tenant AI platform.

The goal of this deployment is to demonstrate that the platform can run outside the local development environment using managed cloud services while preserving the same API-first and multi-tenant architecture.

## Cloud Target

Current MVP target:

```txt
Railway
  -> NestJS API running from Dockerfile
  -> PostgreSQL with pgvector

Cloudflare
  -> R2 object storage for uploaded documents
  -> Workers deployment for the customer demo app

OpenAI
  -> text embeddings
  -> LLM answer generation
```

Planned DevOps additions:

```txt
GitHub Actions
  -> npm ci
  -> Prisma client generation
  -> lint/test/build
  -> Docker image validation
  -> npm audit --audit-level=high
  -> future Prisma migrate deploy

Terraform
  -> Cloudflare R2 resources
  -> future infrastructure-as-code expansion
```

## Railway API

The API service is deployed from the repository using the root `Dockerfile`.

Railway service configuration:

```txt
Source repo: Janeitor/tenant-ai-platform
Branch: main
Root directory: /
Builder: Dockerfile
Dockerfile path: Dockerfile
Start command: empty
Healthcheck path: /api/health
```

The container start command is defined in the Dockerfile:

```txt
node dist/src/main.js
```

The NestJS API reads the runtime port from:

```env
PORT=3000
```

Railway exposes the service through a public generated domain. The API base URL uses the global NestJS prefix:

```txt
https://<railway-domain>/api
```

## Railway PostgreSQL

The database service is Railway PostgreSQL.

The `pgvector` extension was enabled and validated with:

```sql
CREATE EXTENSION IF NOT EXISTS vector;

SELECT extname
FROM pg_extension
WHERE extname = 'vector';
```

Expected result:

```txt
vector
```

The API service uses Railway's internal database reference:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

For local manual migrations against the cloud database, Railway's public database URL must be used instead:

```txt
DATABASE_PUBLIC_URL
```

In PowerShell, it is temporarily assigned to `DATABASE_URL` because Prisma expects that variable name:

```powershell
$env:DATABASE_URL = "postgresql://..."
npm run prisma:migrate --workspace @tenant-ai/api
npm run prisma:generate --workspace @tenant-ai/api
Remove-Item Env:DATABASE_URL
```

This manual migration step is temporary. The production-oriented future flow should use:

```txt
prisma migrate deploy
```

from CI/CD or a controlled deploy step.

## Cloudflare R2

Cloudflare R2 is used as S3-compatible object storage for uploaded documents.

Current bucket:

```txt
tenant-ai-documents
```

The API uses the existing storage adapter with the following Railway variables:

```env
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=tenant-ai-documents
S3_ACCESS_KEY=<r2-access-key-id>
S3_SECRET_KEY=<r2-secret-access-key>
```

Important naming detail:

```txt
The current S3StorageAdapter expects S3_ACCESS_KEY and S3_SECRET_KEY.
It does not read S3_ACCESS_KEY_ID or S3_SECRET_ACCESS_KEY.
```

Uploaded documents are stored with tenant-scoped keys:

```txt
{tenantId}/documents/{timestamp}-{uuid}-{safeFileName}
```

## OpenAI Configuration

The cloud deployment uses OpenAI for embeddings and answer generation.

Railway API variables:

```env
EMBEDDING_PROVIDER=openai
EMBEDDING_DIMENSIONS=1536
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
LLM_PROVIDER_NAME=openai
OPENAI_MODEL=gpt-5-mini
OPENAI_API_KEY=<openai-api-key>
MIN_RETRIEVAL_SIMILARITY=0.5
MAX_CONTEXT_TOKENS=8000
MAX_CHUNKS_PER_QUERY=5
```

The OpenAI API key must be created in OpenAI Platform. A ChatGPT Plus subscription alone is not enough to use the API.

## Cloudflare Workers Client Demo

The customer demo app is deployed to Cloudflare Workers using OpenNext for Cloudflare.

This is required because the demo is not a purely static site. It includes a server-side Next.js route:

```txt
apps/client-demo/src/app/api/ask/route.ts
```

That route keeps the tenant API key out of the browser and forwards questions to the Railway API with:

```txt
x-api-key: tai_...
```

Implemented files:

```txt
apps/client-demo/open-next.config.ts
apps/client-demo/wrangler.jsonc
```

Client demo build scripts:

```txt
npm run build:cloudflare --workspace @tenant-ai/client-demo
npm run preview:cloudflare --workspace @tenant-ai/client-demo
npm run deploy:cloudflare --workspace @tenant-ai/client-demo
```

Cloudflare Worker deployment settings:

```txt
Repository: Janeitor/tenant-ai-platform
Path: /
Build command: npm run build:cloudflare --workspace @tenant-ai/client-demo
Deploy command: npx wrangler deploy --config apps/client-demo/wrangler.jsonc
```

Runtime variables:

```env
TENANT_AI_API_URL=https://<railway-domain>/api
TENANT_AI_API_KEY=<tenant-api-key>
```

Security requirement:

```txt
TENANT_AI_API_KEY must be configured as a Cloudflare secret.
TENANT_AI_API_URL may be plaintext.
```

Validated public demo URL pattern:

```txt
https://<worker-name>.<cloudflare-account>.workers.dev
```

The deployed demo was validated by asking a question from the notary-style intranet UI and receiving an answer from the Railway API using tenant-scoped document retrieval.

## Required Railway API Variables

The API service requires:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=${{Postgres.DATABASE_URL}}
API_KEY_PEPPER=<secret>

S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=tenant-ai-documents
S3_ACCESS_KEY=<secret>
S3_SECRET_KEY=<secret>

EMBEDDING_PROVIDER=openai
EMBEDDING_DIMENSIONS=1536
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
LLM_PROVIDER_NAME=openai
OPENAI_MODEL=gpt-5-mini
OPENAI_API_KEY=<secret>

MIN_RETRIEVAL_SIMILARITY=0.5
MAX_CONTEXT_TOKENS=8000
MAX_CHUNKS_PER_QUERY=5
```

Do not commit secrets. Configure them only through Railway variables or a future secret manager.

## Validated Cloud Flow

The following flow was validated in the cloud environment:

```txt
1. Railway API healthcheck
2. Prisma migrations applied to Railway PostgreSQL
3. Tenant created
4. Tenant API key created
5. Protected document endpoint accessed with x-api-key
6. PDF uploaded through Railway API
7. PDF stored in Cloudflare R2
8. Document ingested
9. Text extracted from PDF
10. Chunks created
11. OpenAI embeddings generated
12. Vectors stored in PostgreSQL pgvector
13. /api/ask answered using retrieved tenant context
14. /api/usage returned persisted usage logs
15. Cloudflare Worker client demo called the Railway API through a server-side route
16. Tenant API key remained configured as a Cloudflare secret
```

Example validation commands:

```powershell
$apiUrl = "https://<railway-domain>/api"

Invoke-RestMethod "$apiUrl/health"
```

Create a tenant:

```powershell
$tenant = Invoke-RestMethod `
  -Method Post `
  -Uri "$apiUrl/tenants" `
  -ContentType "application/json" `
  -Body '{"name":"Notaria Demo","slug":"notaria-demo"}'
```

Create a tenant API key:

```powershell
$apiKeyResponse = Invoke-RestMethod `
  -Method Post `
  -Uri "$apiUrl/tenants/$($tenant.id)/api-keys" `
  -ContentType "application/json" `
  -Body '{"name":"Client demo key"}'
```

Upload a PDF:

```powershell
$document = curl.exe -X POST `
  "$apiUrl/documents/upload" `
  -H "x-api-key: $apiKey" `
  -F "file=@demo-files/DERECHO-NOTARIAL-CHILENO.pdf"

$documentObject = $document | ConvertFrom-Json
```

Ingest the document:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "$apiUrl/documents/$($documentObject.id)/ingest" `
  -Headers @{"x-api-key"=$apiKey}
```

Ask a question:

```powershell
$response = Invoke-RestMethod `
  -Method Post `
  -Uri "$apiUrl/ask" `
  -Headers @{"x-api-key"=$apiKey} `
  -ContentType "application/json" `
  -Body '{"question":"Que es el derecho notarial chileno?","limit":5}'

$response | ConvertTo-Json -Depth 5
```

Review usage logs:

```powershell
$usage = Invoke-RestMethod `
  -Method Get `
  -Uri "$apiUrl/usage?page=1&limit=5" `
  -Headers @{"x-api-key"=$apiKey}

$usage | ConvertTo-Json -Depth 5
```

## Current Manual Steps

The current cloud deployment still includes manual steps:

```txt
Railway service setup
Cloudflare R2 bucket setup
R2 API token creation
Railway variable configuration
Cloudflare Worker variable/secret configuration
Prisma migrations from local terminal using DATABASE_PUBLIC_URL
```

These are acceptable for the first cloud validation, but should be automated or documented as controlled release steps before final delivery.

## GitHub Actions CI

The project includes a CI workflow:

```txt
.github/workflows/ci.yml
```

It runs on:

```txt
push to main
pull_request to main
```

Current validation steps:

```txt
Checkout repository
Setup Node.js 22
npm ci
Generate Prisma client
npm run lint
npm run test
npm run build
docker build -t tenant-ai-api:ci .
npm audit --audit-level=high
```

The Prisma client generation step is required because:

```txt
apps/api/generated/prisma
```

is intentionally ignored by Git. CI runs on a clean machine, so the generated client must be recreated before tests and builds can import:

```txt
#prisma-client
```

The workflow uses a dummy `DATABASE_URL` for Prisma generation. `prisma generate` needs a valid database URL format through Prisma 7 configuration, but it does not need to connect to the database for client generation.

Security policy in CI:

```txt
npm audit --audit-level=high
```

This means high and critical vulnerabilities fail CI. Known moderate findings are tracked in `docs/vulnerability-analysis.md` and do not currently block the MVP pipeline because their automatic fixes require breaking downgrades.

## Future Automation

Recommended next DevOps improvements:

```txt
GitHub Actions
  -> keep CI as the validation gate
  -> optionally publish Docker images to a container registry

Prisma deployment
  -> add prisma:migrate:deploy script
  -> run prisma migrate deploy in CI/CD or Railway pre-deploy

Terraform
  -> manage Cloudflare R2 bucket
  -> manage Cloudflare Worker resources if practical
  -> document provider variables and remote state decision
```

Prisma migrations should not be managed by Terraform. Terraform manages infrastructure resources; Prisma manages application database schema changes.
