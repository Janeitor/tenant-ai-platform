# Guía De Integración Para Consultas API

Esta guía explica cómo un cliente puede integrar la consulta de documentos de Tenant AI dentro de una aplicación existente.

## Objetivo

Tenant AI está diseñado como una solución API-first. Un sistema cliente puede consultar documentos de su tenant llamando a la API de Tenant AI desde un entorno backend seguro.

El cliente no necesita administrar:

- embeddings
- búsqueda vectorial
- chunking de documentos
- llamadas a OpenAI
- filtrado por tenant
- tracking de uso

Tenant AI se encarga de esas responsabilidades.

## Autenticación

Cada tenant cliente recibe una API key acotada a ese tenant:

```txt
tai_...
```

La API key debe almacenarse en un entorno backend seguro, de forma similar a como una aplicación almacenaría una API key de OpenAI.

No exponer la API key en:

- JavaScript del navegador
- HTML público
- variables de entorno del frontend
- repositorios de código fuente

Variables de entorno recomendadas para el cliente:

```env
TENANT_AI_API_URL=https://api.example.com/api
TENANT_AI_API_KEY=tai_your_tenant_api_key
```

## Flujo De Solicitud

```txt
Navegador del cliente
  |
Frontend del cliente
  |
Backend del cliente
  |
Tenant AI API /api/ask
  |
Tenant AI resuelve el tenant desde x-api-key
  |
Retrieval acotado al tenant + generación de respuesta
  |
Backend del cliente
  |
Frontend del cliente
```

El frontend del cliente debe llamar a su propio backend. El backend del cliente llama luego a Tenant AI usando la API key del tenant.

## Endpoint De Consulta

```http
POST /api/ask
Content-Type: application/json
x-api-key: tai_...
```

Body de la solicitud:

```json
{
  "question": "A quien visita Caperucita Roja?",
  "limit": 5
}
```

Respuesta:

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

## Ejemplo En Node.js

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

El navegador del cliente debe llamar a `/internal/ask`, no directamente a Tenant AI.

## Contexto Insuficiente

Si no se encuentra un documento relevante del tenant, Tenant AI devuelve una respuesta controlada:

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

Esto significa que el sistema no encontró evidencia suficiente en los documentos del tenant para responder.

## Aislamiento Por Tenant

El cliente no envía `tenantId`.

Tenant AI resuelve la identidad del tenant desde:

```txt
x-api-key
```

Todas las consultas de retrieval filtran por el tenant autenticado. Una API key de tenant solo puede recuperar documentos que pertenecen a ese tenant.

## Aplicación Client Demo

Este repositorio incluye `apps/client-demo`, una aplicación cliente de ejemplo que demuestra el patrón de integración recomendado. La interfaz actual simula una intranet notarial donde un usuario interno puede hacer preguntas sobre los documentos del tenant sin ver detalles de implementación como API keys, uso de tokens o metadata de retrieval.

Se comporta como una aplicación externa de un cliente:

- no importa código backend desde `apps/api`
- no se conecta a Prisma
- no conoce el `tenantId`
- llama a Tenant AI a través de HTTP
- mantiene la API key del tenant en el servidor

El demo usa una ruta server-side de Next.js como capa de integración backend del cliente.

```txt
Navegador
  |
Página apps/client-demo
  |
Ruta server apps/client-demo /api/ask
  |
Tenant AI API /api/ask con x-api-key
```

El demo público en cloud está desplegado como Cloudflare Worker usando OpenNext. Esto mantiene el mismo modelo de seguridad que la versión local de Next.js:

```txt
Navegador
  |
Frontend en Cloudflare Worker
  |
Ruta server /api/ask del Cloudflare Worker
  |
Tenant AI Railway API con x-api-key
```

Configuración de runtime:

```env
TENANT_AI_API_URL=https://<railway-domain>/api
TENANT_AI_API_KEY=tai_your_tenant_api_key
```

`TENANT_AI_API_KEY` debe almacenarse como secret de Cloudflare. No debe exponerse como JavaScript del lado cliente ni committearse al repositorio.

## Ejecutar El Client Demo Localmente

Crear:

```txt
apps/client-demo/.env.local
```

Ejemplo:

```env
TENANT_AI_API_URL=http://localhost:3000/api
TENANT_AI_API_KEY=tai_your_tenant_api_key
```

Iniciar la API Tenant AI:

```bash
npm run start:dev --workspace @tenant-ai/api
```

Iniciar el client demo:

```bash
npm run dev --workspace @tenant-ai/client-demo
```

Abrir:

```txt
http://localhost:3001
```

Haz una pregunta sobre los documentos del tenant. El client demo llamará a su propia ruta server-side, que reenviará la solicitud a Tenant AI usando la API key del tenant.
