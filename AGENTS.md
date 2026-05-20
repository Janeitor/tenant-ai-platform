# AGENTS.md

## Project context

This project is a multi-tenant enterprise AI platform that exposes a RAG API for companies to query their internal documents without managing AI infrastructure.

The product must prioritize:
- API-first design
- multi-tenant isolation
- clean architecture
- secure document processing
- retrieval with tenant filtering
- responses with sources
- token usage visibility
- testable and maintainable code

The initial deliverable is not a throwaway prototype. All implemented features should follow the same architecture, security and maintainability standards expected from the final product.

---

## Collaboration and learning mode

The developer is learning the stack while building the project.

Before implementing a new feature or module:
- Explain the mental model and request flow first.
- Describe which files will be created or modified and why.
- Implement the change step by step.
- After implementation, provide a short recap explaining how the new pieces interact.
- Encourage questions before moving to the next feature.

Avoid unexplained "vibecoding". The project should progress in a way that leaves the developer able to understand, maintain and explain the code.

---

## Tech stack

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

---

## Architecture rules

Use modular architecture in NestJS.

Preferred modules:
- auth
- tenants
- api-keys
- documents
- ingestion
- embeddings
- retrieval
- chat
- usage
- health

The usage module must track and expose token consumption for product visibility.

Do not mix business logic inside controllers.

Controllers should only:
- validate request
- call application services
- return DTOs

Business logic must live in services/use cases.

Infrastructure-specific logic must be isolated in providers/adapters.

---

## Multi-tenancy rules

Tenant isolation is mandatory.

Every document, chunk, conversation, API key and usage record must include tenantId.

Every database query involving business data must filter by tenantId.

Never allow cross-tenant access.

Never trust tenantId from the request body if an API key or JWT already resolves the tenant.

---

## RAG rules

The `/ask` flow should be:

1. Resolve tenant from API key.
2. Create embedding for the user question.
3. Search relevant chunks filtered by tenantId.
4. Build a prompt using only retrieved context.
5. Call the LLM.
6. Return answer, sources and usage metadata.

Responses must include sources when available.

If no relevant context is found, the assistant must say that the available documents do not contain enough information.

---

## Usage and token tracking rules

The product must include basic token usage visibility from the initial deliverable.

For each `/ask` request, store and return usage metadata when available:
- input tokens
- output tokens
- total tokens
- model used
- provider used
- estimated cost when pricing configuration is available
- tenantId
- request timestamp

The `/ask` response should include a `usage` object.

Example response shape:

```json
{
  "answer": "Based on the available documents...",
  "sources": [
    {
      "documentId": "doc_123",
      "documentName": "HR Policy.pdf",
      "chunkId": "chunk_456"
    }
  ],
  "usage": {
    "provider": "openai",
    "model": "gpt-4.1-mini",
    "inputTokens": 1200,
    "outputTokens": 250,
    "totalTokens": 1450,
    "estimatedCostUsd": 0.0012
  }
}
```

Token usage must be persisted in `usage_logs`.

Usage visibility should support:
- per request usage
- per tenant usage
- future monthly limits

Do not block the initial deliverable if a provider does not return exact usage data. In that case, store `null` for unavailable values and keep the response shape consistent.


## Testing rules

Add or update tests for every relevant change.

Use:
- unit tests for services
- integration tests for API endpoints
- mocked LLM providers in tests
- mocked embedding providers where appropriate

Important tests:
- tenant isolation
- API key authentication
- document upload
- chunk creation
- vector search filtered by tenant
- `/ask` response shape
- usage logging
- token usage returned by `/ask`

Do not call real OpenAI/Gemini APIs in automated tests.

---

## Code style

Use TypeScript strict mode.

Prefer:
- explicit DTOs
- dependency injection
- small services
- clear module boundaries
- descriptive names
- async/await
- environment variables via config service

Avoid:
- hardcoded secrets
- business logic in controllers
- direct provider SDK calls outside infrastructure adapters
- untyped `any`
- global mutable state

---

## Security rules

Never commit secrets.

Use `.env.example` for required environment variables.

Validate uploaded files:
- allowed MIME types
- max file size
- tenant ownership

Do not log API keys, prompts with sensitive data, or full document contents.

---

## Vulnerability analysis

The product should include basic vulnerability analysis as part of development and CI from the initial deliverable.

Use automated checks for:
- dependency vulnerabilities with `npm audit` or an equivalent tool
- secret detection before commits and in CI
- static analysis and security-focused lint rules where practical
- Docker image vulnerability scanning when container images are introduced
- API security review based on OWASP API Security Top 10

Security-sensitive flows must include tests for:
- tenant isolation
- API key authentication and authorization failures
- unauthorized cross-tenant access attempts
- file upload validation
- prompt, source and document data leakage prevention

Vulnerability findings should be documented with:
- severity
- affected component
- reproduction or evidence
- recommended fix
- status

Do not block the initial deliverable on advanced enterprise security tooling, but keep the project ready to add stronger checks in CI/CD.

---

## Database rules

Use Prisma migrations.

Use PostgreSQL with pgvector for embeddings.

Prefer schema designs that enforce tenant ownership.

Vector search queries must include tenant filtering.

---

## Git rules

Before finishing a task, run:

```bash
npm run lint
npm run test
npm run build
```

If a command fails, explain the failure and propose the smallest fix.

---

## Documentation rules

Update README.md when:
- setup changes
- environment variables change
- API endpoints change
- deployment instructions change

Keep documentation useful for the TFM evaluator.

---

## Initial deliverable scope

Do implement:
- tenant creation
- API key auth
- document upload
- ingestion
- embeddings
- vector retrieval
- ask endpoint
- sources
- usage logs
- token usage visibility
- tests
- Docker Compose

Do not implement yet:
- agents
- fine-tuning
- complex workflows
- ERP connectors
- advanced RBAC
- billing integration
- Terraform production automation
