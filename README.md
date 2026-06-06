# TFM Multitenant RAG

Plataforma de IA empresarial multi-tenant que expone una API RAG para que las empresas puedan consultar documentos internos sin administrar infraestructura de IA.

## Objetivo Del Producto

Construir una plataforma orientada a producción con:
- diseño API-first
- aislamiento multi-tenant
- procesamiento seguro de documentos
- retrieval con filtrado por tenant
- respuestas con fuentes
- visibilidad del uso de tokens
- arquitectura mantenible y tests automatizados

El entregable inicial no es un prototipo desechable. Las funcionalidades implementadas deben seguir estándares de arquitectura, seguridad y mantenibilidad esperados para el producto final.

## Herramientas Requeridas

- Node.js 22 LTS
- npm
- Git
- Docker Desktop con Docker Compose

Alineación local recomendada:

```bash
node -v
npm -v
git --version
docker compose version
```

El proyecto debe usar la misma versión mayor de Node.js localmente, en Docker y en GitHub Actions.

Actualmente probado con:

```txt
Node.js v22.22.3
npm 10.9.8
```

## Tech Stack Planificado

- Backend: NestJS + TypeScript
- Base de datos: PostgreSQL + pgvector
- ORM: Prisma
- Proveedores de IA: OpenAI SDK y/o Gemini SDK
- Queue: BullMQ + Redis
- Storage: almacenamiento compatible con S3
- Frontend: Next.js
- Tests: Jest + Supertest
- Docker: Docker Compose para desarrollo local
- CI/CD: GitHub Actions

## Estructura Del Proyecto

```txt
.
├── apps/
│   ├── api/
│   │   ├── prisma/
│   │   │   ├── migrations/
│   │   │   └── schema.prisma
│   │   └── src/
│   │       ├── api-keys/
│   │       ├── auth/
│   │       ├── chat/
│   │       ├── context/
│   │       ├── documents/
│   │       ├── embeddings/
│   │       ├── health/
│   │       ├── ingestion/
│   │       ├── llm/
│   │       ├── prisma/
│   │       ├── retrieval/
│   │       ├── storage/
│   │       ├── tenants/
│   │       └── usage/
│   ├── client-demo/
│   │   └── src/app/
│   │       ├── api/ask/
│   │       └── page.tsx
│   └── web/
├── docs/
│   ├── api-query-integration-guide.md
│   ├── cloud-deployment.md
│   └── vulnerability-analysis.md
├── infra/
│   └── terraform/
│       └── cloudflare/
├── packages/
│   └── shared/
├── demo-files/
├── .github/
│   └── workflows/
├── Dockerfile
├── docker-compose.yml
├── AGENTS.md
├── ARCHITECTURE.md
└── README.md
```

`apps/client-demo` es una aplicación cliente de ejemplo. Está incluida en el monorepo con fines demostrativos, pero se comporta como un sistema externo de un cliente: llama a la API de Tenant AI mediante HTTP y mantiene la API key del tenant en una variable de entorno server-side.

## Setup Local

Instalar dependencias:

```bash
npm install
```

Crear un archivo de entorno local desde el ejemplo:

```bash
cp .env.example .env
```

En Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Ejecutar validaciones del proyecto:

```bash
npm run lint
npm run test
npm run build
```

## Client Demo

El proyecto incluye una aplicación de ejemplo para integración de clientes:

```txt
apps/client-demo
```

Simula una intranet notarial que consume:

```txt
POST /api/ask
```

El navegador no llama directamente a Tenant AI. En su lugar, el demo usa una ruta server-side de Next.js que lee:

```env
TENANT_AI_API_URL=http://localhost:3000/api
TENANT_AI_API_KEY=tai_...
```

y reenvía la solicitud a la API de Tenant AI con:

```txt
x-api-key: tai_...
```

La versión cloud está desplegada como Cloudflare Worker usando OpenNext, manteniendo el mismo manejo server-side de la API key.

Ejecutar localmente:

```bash
npm run dev --workspace @tenant-ai/client-demo
```

Luego abrir:

```txt
http://localhost:3001
```

Para detalles de integración de clientes, ver:

```txt
docs/api-query-integration-guide.md
```

Para el despliegue cloud validado del MVP, ver:

```txt
docs/cloud-deployment.md
```

## Integración Continua

El repositorio incluye un workflow de GitHub Actions:

```txt
.github/workflows/ci.yml
```

Se ejecuta en pushes y pull requests que apuntan a `main`.

Checks actuales:

```txt
npm ci
Generación del cliente Prisma
npm run lint
npm run test
npm run build
Docker image build
npm audit --audit-level=high
```

El cliente Prisma se genera dentro de CI porque el output generado de Prisma está intencionalmente fuera de Git. Vulnerabilidades `high` o `critical` hacen fallar CI. Los hallazgos `moderate` conocidos están documentados en `docs/vulnerability-analysis.md`.

## Infrastructure As Code

El MVP incluye una configuración inicial de Terraform para infraestructura Cloudflare:

```txt
infra/terraform/cloudflare
```

Alcance actual de Terraform:

```txt
Bucket Cloudflare R2 usado para almacenar documentos de tenants
```

El bucket R2 existente fue importado al estado de Terraform y validado con `terraform plan`, que devolvió que no había cambios. El estado local de Terraform, archivos locales de variables y archivos de cache del provider están intencionalmente ignorados por Git:

```txt
infra/terraform/cloudflare/.terraform/
infra/terraform/cloudflare/terraform.tfstate
infra/terraform/cloudflare/terraform.tfvars
```

Los archivos Terraform committeados documentan la infraestructura esperada de Cloudflare R2 sin committear secretos. Las migraciones Prisma siguen siendo administradas por Prisma y pasos de release/CI/CD, no por Terraform.

## Demo Flow

Este flujo demuestra el producto end-to-end actual localmente.

### 1. Iniciar infraestructura local

```bash
docker compose up -d
```

Revisar servicios:

```bash
docker compose ps
```

Servicios locales esperados:

```txt
PostgreSQL + pgvector
Redis
MinIO
```

### 2. Configurar entorno

Crear `.env` desde `.env.example` si es necesario:

```bash
cp .env.example .env
```

Configuración recomendada para demo:

```env
EMBEDDING_PROVIDER=openai
EMBEDDING_DIMENSIONS=1536
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
LLM_PROVIDER_NAME=openai
OPENAI_MODEL=gpt-5-mini
MIN_RETRIEVAL_SIMILARITY=0.5
```

`OPENAI_API_KEY` debe estar configurada localmente. No committear secretos.

Para una demo local sin costo externo:

```env
EMBEDDING_PROVIDER=local
LLM_PROVIDER_NAME=local
```

### 3. Ejecutar migraciones de base de datos

```bash
npm run prisma:migrate --workspace @tenant-ai/api
npm run prisma:generate --workspace @tenant-ai/api
```

### 4. Iniciar la API

```bash
npm run start:dev --workspace @tenant-ai/api
```

Health check:

```powershell
Invoke-RestMethod http://localhost:3000/api/health
```

### 5. Preparar una API key de tenant

Las llamadas de demo a la API usan:

```txt
x-api-key: tai_...
```

La API key resuelve el tenant. El cliente no debe enviar `tenantId`.

En PowerShell:

```powershell
$apiKey = "tai_your_tenant_api_key"
```

### 6. Subir e ingestar un documento

Subir un documento de texto o PDF:

```powershell
curl.exe -X POST `
  http://localhost:3000/api/documents/upload `
  -H "x-api-key: $apiKey" `
  -F "file=@sample-document-caperucita.txt"
```

Los archivos PDF son soportados cuando contienen texto seleccionable. PDFs escaneados o basados solo en imágenes requieren OCR y están fuera del alcance actual del MVP.

Usar el `id` devuelto para ingestar:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:3000/api/documents/DOCUMENT_ID/ingest `
  -Headers @{"x-api-key"=$apiKey}
```

La ingestion crea chunks, estima conteos de tokens, genera embeddings y almacena vectores en PostgreSQL usando pgvector.

### 7. Consultar la API

Hacer una pregunta:

```powershell
$response = Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3000/api/ask" `
  -Headers @{"x-api-key"=$apiKey} `
  -ContentType "application/json" `
  -Body '{"question":"A quien visita Caperucita Roja?","limit":5}'

$response | ConvertTo-Json -Depth 5
```

Comportamiento esperado:

```txt
respuesta basada en documentos
fuentes con documentName y chunkId
usage con provider/model/tokens/context metrics
```

Preguntar algo no relacionado:

```powershell
$response = Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3000/api/ask" `
  -Headers @{"x-api-key"=$apiKey} `
  -ContentType "application/json" `
  -Body '{"question":"Quien es el dueno de SpaceX","limit":5}'

$response | ConvertTo-Json -Depth 5
```

Con `MIN_RETRIEVAL_SIMILARITY=0.5`, la respuesta esperada tiene:

```txt
sources: []
usage.selectedChunks: 0
```

### 8. Revisar usage logs

```powershell
$response = Invoke-RestMethod `
  -Method Get `
  -Uri "http://localhost:3000/api/usage?page=1&limit=5" `
  -Headers @{"x-api-key"=$apiKey}

$response | ConvertTo-Json -Depth 5
```

Los usage logs están acotados por tenant e incluyen métricas de tokens/contexto cuando están disponibles.

### 9. Ejecutar el client demo

Crear:

```txt
apps/client-demo/.env.local
```

Ejemplo:

```env
TENANT_AI_API_URL=http://localhost:3000/api
TENANT_AI_API_KEY=tai_your_tenant_api_key
```

Iniciar el demo app:

```bash
npm run dev --workspace @tenant-ai/client-demo
```

Abrir:

```txt
http://localhost:3001
```

El demo simula una aplicación cliente para una notaría. Llama a su propia ruta server-side de Next.js, que luego llama a la API de Tenant AI con `x-api-key`. El navegador nunca ve la API key del tenant.

### 10. Validar el proyecto

```bash
npm run lint
npm run test
npm run build
```

## Validación De API

La API usa `ValidationPipe` de NestJS con clases DTO y decoradores de `class-validator` para validar bodies JSON en runtime.

Configuración global de validación:

```txt
whitelist: true
forbidNonWhitelisted: true
transform: true
```

Esto significa:

- campos no declarados en DTOs son rechazados con `400 Bad Request`
- campos requeridos como `question` se validan antes de llegar a controllers/services
- endpoints de negocio protegidos rechazan campos enviados por el cliente como `tenantId` cuando no forman parte del DTO

La identidad del tenant debe venir desde credenciales autenticadas como `x-api-key`, no desde request bodies.

## Infraestructura Local

El proyecto usa Docker Compose para servicios locales de infraestructura:

- PostgreSQL con pgvector en puerto `5432`
- Redis en puerto `6379`
- MinIO storage compatible con S3 en puertos `9000` y `9001`

Iniciar servicios:

```bash
docker compose up -d
```

Revisar estado:

```bash
docker compose ps
```

Detener servicios:

```bash
docker compose down
```

Consola MinIO:

```txt
http://localhost:9001
user: minioadmin
password: minioadmin
```

URLs locales por defecto:

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

## Decisión De Storage

El storage local de documentos usa MinIO porque entrega una API compatible con S3 para desarrollo. La aplicación debe mantener el acceso a storage detrás de un límite provider/adapter en lugar de acoplar lógica de negocio directamente a MinIO.

Dirección planificada de storage:

```txt
Desarrollo local: MinIO
Ruta cloud compatible principal: storage compatible con S3, como AWS S3 o Cloudflare R2
Opción Azure futura: Azure Blob Storage mediante un adapter separado si cambian los requisitos de despliegue
```

Los servicios relacionados con storage deben usar nombres neutrales como `StorageService`, `ObjectStorageService` o `S3StorageAdapter`, no lógica de dominio atada directamente a MinIO.

Abstracción de storage implementada:

```txt
apps/api/src/storage/object-storage.types.ts
apps/api/src/storage/object-storage.service.ts
apps/api/src/storage/s3-storage.adapter.ts
apps/api/src/storage/storage.module.ts
```

La API usa `@aws-sdk/client-s3` para comunicarse con storage compatible con S3. En desarrollo local, esto apunta a MinIO mediante las variables de entorno `S3_*`.

Los services de aplicación deben depender del token provider `OBJECT_STORAGE` y del contrato `ObjectStoragePort`, no directamente de `S3StorageAdapter`.

El adapter S3 verifica el bucket configurado antes de subir archivos y lo crea automáticamente si no existe.

Endpoints actuales de documentos:

```txt
POST /api/documents
GET /api/documents
POST /api/documents/upload
POST /api/documents/:documentId/ingest
```

Todos los endpoints de documentos requieren:

```txt
x-api-key: tai_...
```

`POST /api/documents/upload` acepta `multipart/form-data` con un campo `file`. La validación de upload actualmente permite documentos `text/plain` y `application/pdf`, y limita cada archivo a 5 MB.

Los archivos subidos se almacenan en el bucket compatible con S3 configurado usando object keys acotadas por tenant:

```txt
{tenantId}/documents/{timestamp}-{uuid}-{safeFileName}
```

La fila del documento almacena `storageKey` y usa `status = uploaded` después de una carga exitosa en object storage.

La ingestion básica actualmente soporta documentos de texto plano y PDFs con texto seleccionable. El endpoint de ingestion lee el objeto almacenado mediante la abstracción de storage, extrae texto, lo divide en chunks con solapamiento, estima un conteo de tokens por chunk, los almacena en `document_chunks` y actualiza el documento a `status = ready`.

El soporte PDF no incluye OCR en el MVP actual. PDFs escaneados o basados solo en imágenes requieren un provider OCR futuro.

Comportamiento actual de ingestion:

```txt
POST /api/documents/:documentId/ingest
  -> requiere x-api-key
  -> filtra el documento por tenantId autenticado
  -> soporta text/plain y application/pdf con texto seleccionable
  -> crea document_chunks
  -> almacena tokenCount usando Math.ceil(content.length / 4)
  -> marca el documento como ready
```

Comportamiento actual de embeddings:

```txt
EmbeddingsModule
  -> EmbeddingsService
  -> token EMBEDDING_PROVIDER
  -> LocalEmbeddingProvider u OpenAiEmbeddingProvider
```

El provider de embeddings activo se selecciona con:

```env
EMBEDDING_PROVIDER=local
```

Valores soportados:

```txt
local
openai
```

El provider local de embeddings es determinístico y no llama APIs externas de IA. Genera vectores con `EMBEDDING_DIMENSIONS=1536` para que el desarrollo local coincida con la dimensión de columna pgvector orientada a producción. Durante ingestion, cada chunk de texto recibe un embedding almacenado en PostgreSQL usando pgvector.

El provider de embeddings de OpenAI usa el SDK oficial de OpenAI y el modelo de embeddings configurado:

```env
EMBEDDING_PROVIDER=openai
OPENAI_API_KEY=your-api-key
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536
```

Los tests automatizados mockean el provider de embeddings de OpenAI y no llaman la API real de OpenAI.

Cuando `EMBEDDING_PROVIDER=openai`, cada solicitud de ingestion genera y almacena embeddings de OpenAI para los chunks del documento. Cada solicitud a `/api/ask` también genera un embedding OpenAI para la pregunta del usuario antes de ejecutar retrieval con pgvector. Esto usa cuota de la API de OpenAI incluso si `LLM_PROVIDER_NAME=local`.

La base de datos almacena embeddings de chunks como:

```txt
embedding vector(1536)
```

Esta dimensión está alineada con el modelo de embeddings planificado de OpenAI:

```env
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

Cuando cambia la dimensión de embeddings, los chunk embeddings existentes deben regenerarse. Los datos de desarrollo creados con embeddings locales previos de 8 dimensiones se trataron como datos de prueba desechables y no deben mezclarse con embeddings de 1536 dimensiones.

Cambiar `EMBEDDING_PROVIDER` cambia cómo se generan futuros embeddings. Los documentos existentes deben reingestarse al cambiar de embeddings locales a embeddings OpenAI para que todos los vectores almacenados sean generados por la misma combinación provider/modelo/dimensión.

Antes de persistir embeddings de chunks, ingestion valida que el largo del vector devuelto coincida con la dimensión reportada por el provider y que ambos coincidan con `EMBEDDING_DIMENSIONS`. Esto evita almacenar vectores incompatibles con la columna configurada `vector(1536)`.

Cada chunk almacenado también incluye `tokenCount`, calculado actualmente con la estimación MVP:

```txt
Math.ceil(content.length / 4)
```

Este valor es usado por el flujo de selección de presupuesto de contexto antes de enviar contexto recuperado a un provider LLM.

La selección de presupuesto de contexto está implementada como un service aislado:

```txt
ContextSelectionService
  -> recibe chunks de retrieval ya filtrados por tenant
  -> preserva el orden de retrieval
  -> usa tokenCount o Math.ceil(content.length / 4)
  -> selecciona chunks dentro de maxContextTokens y candidateLimit
```

Este service está conectado al flujo `/api/ask`. `ChatService` recupera chunks candidatos, aplica selección de contexto y envía solo los chunks seleccionados a `LlmService`.

Futuros adapters de embeddings Gemini pueden agregarse después detrás del mismo contrato `EmbeddingProvider`.

Endpoint actual de retrieval:

```txt
POST /api/retrieval/search
```

Body de la solicitud:

```json
{
  "query": "prueba RAG",
  "limit": 5
}
```

El endpoint requiere:

```txt
x-api-key: tai_...
```

Comportamiento de retrieval:

```txt
texto de consulta
  -> embedding local
  -> búsqueda de similitud con pgvector
  -> filtro tenantId desde API key
  -> chunks con metadata de fuente del documento y tokenCount
```

Retrieval usa distancia coseno de pgvector mediante el operador `<=>` y la expone como similitud coseno:

```txt
similarity = 1 - cosine_distance
```

Valores más altos de similarity son más relevantes.

Retrieval puede filtrar coincidencias débiles opcionalmente usando:

```env
MIN_RETRIEVAL_SIMILARITY=
```

Cuando esta variable está vacía, no se aplica threshold de similarity. Cuando está configurada, los chunks con `similarity < MIN_RETRIEVAL_SIMILARITY` se descartan antes de devolver la respuesta al caller o antes de ser usados por `/api/ask`.

Este threshold ayuda a reducir fuentes irrelevantes, tokens de contexto innecesarios y riesgo de alucinación. El valor debe elegirse empíricamente comparando valores de similarity para preguntas relevantes e irrelevantes. Durante pruebas locales respaldadas por OpenAI, `MIN_RETRIEVAL_SIMILARITY=0.5` funcionó como threshold inicial de desarrollo, pero no debe tratarse como valor universal de producción.

Endpoint actual de ask:

```txt
POST /api/ask
```

Body de la solicitud:

```json
{
  "question": "prueba RAG",
  "limit": 5
}
```

El endpoint requiere:

```txt
x-api-key: tai_...
```

Comportamiento actual de ask:

```txt
question
  -> retrieval acotado al tenant
  -> selección de contexto
  -> LlmService
  -> provider LLM local
  -> sources
  -> shape de metadata usage
```

Configuración de selección de contexto:

```env
MAX_CONTEXT_TOKENS=8000
MAX_CHUNKS_PER_QUERY=5
```

Si estas variables no están definidas, la API usa los mismos valores por defecto. Un cliente puede solicitar menos chunks con `limit`, pero no puede exceder `MAX_CHUNKS_PER_QUERY`.

Si ningún chunk recuperado cabe dentro del presupuesto de contexto, `/api/ask` devuelve una respuesta controlada y no llama al provider LLM:

```txt
No relevant context could be selected for this request.
```

`ChatService` delega la generación de respuestas a `LlmService`. El provider por defecto de desarrollo es local, por lo que el flujo `/ask` puede ejecutarse sin API keys externas ni costo de API. El proyecto también incluye un provider OpenAI LLM detrás del mismo contrato de provider, por lo que el provider activo puede cambiarse mediante configuración de entorno sin acoplar el módulo chat directamente al SDK de OpenAI.

El provider LLM activo se selecciona con:

```env
LLM_PROVIDER_NAME=local
```

Valores soportados:

```txt
local
openai
```

Valores no soportados fallan al iniciar la aplicación con un error claro para detectar temprano configuraciones inválidas.

El provider OpenAI usa el SDK oficial de OpenAI y la Responses API. Para habilitarlo localmente, configurar:

```env
LLM_PROVIDER_NAME=openai
OPENAI_API_KEY=your-api-key
OPENAI_MODEL=gpt-5-mini
```

`OPENAI_API_KEY` solo es requerida cuando se usa efectivamente el provider OpenAI. Mantener `LLM_PROVIDER_NAME=local` permite que el desarrollo y los tests automatizados se ejecuten sin llamadas reales a OpenAI.

El provider OpenAI valida que la solicitud tenga una pregunta no vacía y al menos un contexto recuperado no vacío antes de llamar a la API de OpenAI. Esto evita llamadas externas y uso de tokens innecesarios cuando el flujo RAG no tiene contexto utilizable.

Para una prueba RAG completa respaldada por OpenAI, usar:

```env
EMBEDDING_PROVIDER=openai
LLM_PROVIDER_NAME=openai
OPENAI_API_KEY=your-api-key
OPENAI_MODEL=gpt-5-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
EMBEDDING_DIMENSIONS=1536
```

Con esta configuración, `/api/ask` usa OpenAI tanto para embeddings de consulta como para generación de respuestas. El endpoint devuelve respuestas generadas, referencias a fuentes y uso real de tokens cuando la respuesta del provider lo incluye.

Para desarrollo regular sin costo externo de API, usar:

```env
EMBEDDING_PROVIDER=local
LLM_PROVIDER_NAME=local
```

Futuros providers Gemini deben agregarse detrás del contrato existente `LlmProvider`. Los adapters de providers externos deben recibir solo contexto filtrado por tenant desde retrieval y no deben consultar documentos ni resolver ownership del tenant por sí mismos.

Abstracción LLM actual:

```txt
ChatService
  -> LlmService
  -> token LLM_PROVIDER
  -> LocalLlmProvider u OpenAiLlmProvider
```

El provider local devuelve una respuesta basada en el contexto recuperado y preserva el shape de respuesta final esperado por el producto:

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

Cuando no se puede seleccionar contexto dentro del presupuesto configurado, el endpoint devuelve una respuesta controlada y mantiene el mismo shape de `usage`.

Los tests automatizados mockean providers LLM externos. No deben llamar APIs reales de OpenAI o Gemini.

Cada solicitud `/api/ask` se persiste en `usage_logs` mediante `UsageModule`. Los campos de tokens y costo actualmente se almacenan como `null` cuando la implementación local retrieval-only no llama a un provider que entregue uso de tokens. Las métricas de selección de contexto se persisten para visibilidad de uso.

Comportamiento actual de uso:

```txt
POST /api/ask
  -> crea fila usage_logs
  -> tenantId desde x-api-key
  -> provider/model desde el provider LLM activo
  -> campos token desde el provider cuando estén disponibles
  -> contextTokens, selectedChunks, maxContextTokens, candidateLimit
```

Con `LLM_PROVIDER_NAME=local`, los campos token se almacenan como `null`. Con `LLM_PROVIDER_NAME=openai`, el uso real de tokens se devuelve y persiste cuando OpenAI incluye metadata de uso. `estimatedCostUsd` actualmente se almacena como `null`; el cálculo de pricing puede agregarse más adelante cuando se defina una configuración de precios.

Endpoint actual de visibilidad de uso:

```txt
GET /api/usage?page=1&limit=50&startDate=2026-05-01&endDate=2026-05-29
```

El endpoint requiere:

```txt
x-api-key: tai_...
```

Devuelve usage logs solo para el tenant autenticado. El cliente no envía `tenantId`; la API lo resuelve desde la API key.

Query parameters:

```txt
page      opcional, default 1
limit     opcional, default 50, máximo 100
startDate opcional, YYYY-MM-DD
endDate   opcional, YYYY-MM-DD
```

Si `startDate` y `endDate` se omiten, el endpoint usa el mes calendario actual. Si se entrega una fecha, la otra es requerida. El rango máximo personalizado es de 90 días.

Ejemplo de respuesta:

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

## Base De Datos Y Prisma

La API usa Prisma ORM con PostgreSQL. Este proyecto usa actualmente Prisma 7, que mantiene la URL de base de datos en `apps/api/prisma.config.ts` en lugar de declararla dentro de `schema.prisma`.

Archivos importantes:

```txt
apps/api/prisma/schema.prisma
apps/api/prisma.config.ts
apps/api/prisma/migrations/
apps/api/src/prisma/prisma.module.ts
apps/api/src/prisma/prisma.service.ts
```

Aplicar migraciones locales:

```bash
npm run prisma:migrate --workspace @tenant-ai/api -- --name init
```

Generar el cliente Prisma:

```bash
npm run prisma:generate --workspace @tenant-ai/api
```

Abrir Prisma Studio:

```bash
npm run prisma:studio --workspace @tenant-ai/api
```

El output del cliente Prisma se genera en `apps/api/generated/prisma` y está intencionalmente ignorado por Git. Puede regenerarse desde `schema.prisma`.

Modelos actuales:

```txt
Tenant
ApiKey
Document
DocumentChunk
UsageLog
```

La tabla `tenants` es la entidad base para el aislamiento multi-tenant. Futuras entidades de negocio como API keys, documentos, chunks, conversaciones y usage logs deben incluir `tenantId`.

## Autenticación Con API Key

Las API keys son credenciales acotadas por tenant usadas para autenticar endpoints de negocio como carga de documentos, retrieval, chat y visibilidad de uso.

Crear una API key para un tenant:

```txt
POST /api/tenants/:tenantId/api-keys
```

Listar API keys de un tenant:

```txt
GET /api/tenants/:tenantId/api-keys
```

La API key en texto plano se devuelve solo una vez durante la creación. La base de datos almacena:

- `keyHash`: hash HMAC-SHA256 usando `API_KEY_PEPPER`
- `keyPrefix`: prefijo corto visible para identificación
- `tenantId`: tenant propietario
- `revokedAt`: timestamp nullable de revocación

Los endpoints protegidos reciben API keys mediante este header:

```txt
x-api-key: tai_...
```

`ApiKeyAuthGuard` valida el header, resuelve el tenant propietario y adjunta metadata de API key autenticada al request. Los endpoints de negocio deben usar el tenant resuelto desde la API key en lugar de confiar en `tenantId` desde request bodies.

## Seguimiento De Vulnerabilidades

Los hallazgos de vulnerabilidades durante el desarrollo están documentados en:

```txt
docs/vulnerability-analysis.md
```

Esto incluye el hallazgo actual de `npm audit` relacionado con tooling de desarrollo de Prisma y la razón para monitorearlo en vez de aplicar un downgrade automático incompatible.

## Estado De Documentación

Este README se actualizará cuando cambien setup, variables de entorno, endpoints de API e instrucciones de despliegue.
