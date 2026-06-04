# API Query Integration Guide

This guide explains how a customer can integrate Tenant AI document querying into an existing application.

## Goal

Tenant AI is API-first. A customer system can query tenant documents by calling the Tenant AI API from a secure backend environment.

The customer does not need to manage:

- embeddings
- vector search
- document chunking
- OpenAI calls
- tenant filtering
- usage tracking

Tenant AI handles those responsibilities.

## Authentication

Each customer tenant receives a tenant-scoped API key:

```txt
tai_...
```

The API key must be stored in a secure backend environment, similar to how an application would store an OpenAI API key.

Do not expose the API key in:

- browser JavaScript
- public HTML
- frontend environment variables
- source code repositories

Recommended customer environment variables:

```env
TENANT_AI_API_URL=https://api.example.com/api
TENANT_AI_API_KEY=tai_your_tenant_api_key
```

## Request Flow

```txt
Customer browser
  |
Customer frontend
  |
Customer backend
  |
Tenant AI API /api/ask
  |
Tenant AI resolves tenant from x-api-key
  |
Tenant-scoped retrieval + answer generation
  |
Customer backend
  |
Customer frontend
```

The customer frontend should call its own backend. The customer backend then calls Tenant AI with the tenant API key.

## Query Endpoint

```http
POST /api/ask
Content-Type: application/json
x-api-key: tai_...
```

Request body:

```json
{
  "question": "A quien visita Caperucita Roja?",
  "limit": 5
}
```

Response:

```json
{
  "answer": "Visita a su abuela, que está enferma.",
  "sources": [
    {
      "documentId": "cmpusgx3s0000wsotlzkmnz5n",
      "documentName": "sample-document-caperucita.txt",
      "chunkId": "0a8b651c-c9c1-4bcd-bb93-21fdfb0e609c"
    }
  ],
  "usage": {
    "provider": "openai",
    "model": "gpt-5-mini",
    "inputTokens": 322,
    "outputTokens": 170,
    "totalTokens": 492,
    "estimatedCostUsd": null,
    "contextTokens": 216,
    "selectedChunks": 1,
    "maxContextTokens": 8000,
    "candidateLimit": 5
  }
}
```

## Node.js Example

```ts
app.post('/internal/ask', async (req, res) => {
  const response = await fetch(`${process.env.TENANT_AI_API_URL}/ask`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.TENANT_AI_API_KEY,
    },
    body: JSON.stringify({
      question: req.body.question,
      limit: 5,
    }),
  });

  const data = await response.json();

  res.status(response.status).json(data);
});
```

The customer's browser should call `/internal/ask`, not Tenant AI directly.

## Insufficient Context

If no relevant tenant document is found, Tenant AI returns a controlled response:

```json
{
  "answer": "No relevant context could be selected for this request.",
  "sources": [],
  "usage": {
    "provider": "local",
    "model": "retrieval-only",
    "inputTokens": null,
    "outputTokens": null,
    "totalTokens": null,
    "estimatedCostUsd": null,
    "contextTokens": 0,
    "selectedChunks": 0,
    "maxContextTokens": 8000,
    "candidateLimit": 5
  }
}
```

This means the system did not find enough evidence in the tenant documents to answer.

## Tenant Isolation

The customer does not send `tenantId`.

Tenant AI resolves tenant identity from:

```txt
x-api-key
```

Every retrieval query filters by the authenticated tenant. A tenant API key can only retrieve documents that belong to that tenant.

## Client Demo Application

This repository includes `apps/client-demo`, a sample customer application that demonstrates the recommended integration pattern. The current UI simulates a notary intranet where an internal user can ask questions over tenant documents without seeing implementation details such as API keys, token usage or retrieval metadata.

It behaves like an external customer application:

- it does not import backend code from `apps/api`
- it does not connect to Prisma
- it does not know the tenantId
- it calls Tenant AI through HTTP
- it keeps the tenant API key server-side

The demo uses a Next.js server route as the customer's backend integration layer.

```txt
Browser
  |
apps/client-demo page
  |
apps/client-demo /api/ask server route
  |
Tenant AI API /api/ask with x-api-key
```

## Running The Client Demo Locally

Create:

```txt
apps/client-demo/.env.local
```

Example:

```env
TENANT_AI_API_URL=http://localhost:3000/api
TENANT_AI_API_KEY=tai_your_tenant_api_key
```

Start the Tenant AI API:

```bash
npm run start:dev --workspace @tenant-ai/api
```

Start the client demo:

```bash
npm run dev --workspace @tenant-ai/client-demo
```

Open:

```txt
http://localhost:3001
```

Ask a question about the tenant documents. The client demo will call its own server route, which forwards the request to Tenant AI using the tenant API key.
