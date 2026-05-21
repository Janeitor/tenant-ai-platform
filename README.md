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
```

## Documentation Status

This README will be updated as setup, environment variables, API endpoints and deployment instructions are defined.
