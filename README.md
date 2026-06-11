# TFM Multitenant RAG

![Node.js](https://img.shields.io/badge/Node.js-22_LTS-339933?logo=node.js&logoColor=white)
![NestJS](https://img.shields.io/badge/NestJS-API-E0234E?logo=nestjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL%20%2B%20pgvector-Database-4169E1?logo=postgresql&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Local%20Infra-2496ED?logo=docker&logoColor=white)
![CI](https://img.shields.io/badge/GitHub_Actions-CI-2088FF?logo=githubactions&logoColor=white)

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

El entregable inicial no es un prototipo desechable, pero tampoco representa el producto final completo. Es un MVP funcional construido con una base técnica pensada para evolucionar. Las funcionalidades implementadas deben seguir estándares de arquitectura, seguridad y mantenibilidad esperados para una versión productiva, dejando espacio para futuras mejoras como paneles de administración, automatización de despliegues, observabilidad avanzada, billing, RBAC y nuevas integraciones.

## Vista General De Arquitectura

```mermaid
flowchart TD
  Customer["Aplicacion cliente"] -->|HTTP + x-api-key| Api["Tenant AI API"]
  Api --> Auth["ApiKeyAuthGuard"]
  Auth --> Tenant["Tenant resuelto desde API key"]
  Tenant --> Retrieval["Retrieval tenant-scoped"]
  Retrieval --> Pg[("PostgreSQL + pgvector")]
  Retrieval --> Context["Seleccion de contexto"]
  Context --> Llm["LLM Provider"]
  Llm --> Usage["Usage logs"]
  Llm --> Response["Respuesta con fuentes"]
  Api --> Storage["S3-compatible storage"]
```

> [!NOTE]
> El cliente no envía `tenantId`. La API resuelve el tenant desde `x-api-key` y todas las consultas de negocio deben filtrar por ese tenant.

## Herramientas Previas Requeridas

Antes de ejecutar comandos del proyecto, el equipo debe tener instaladas estas herramientas base. Estas herramientas no se instalan con `npm install`; son prerequisitos del sistema operativo o del entorno de desarrollo.

| Herramienta | Versión recomendada | Uso en el proyecto |
| --- | --- | --- |
| Node.js | 22 LTS | Ejecutar los workspaces `api`, `client-demo`, scripts de build y tests |
| npm | 10.x o superior | Instalar dependencias y ejecutar scripts del monorepo |
| Git | versión estable reciente | Clonar el repositorio y revisar cambios |
| Docker Desktop | versión estable reciente | Levantar PostgreSQL, Redis y MinIO con Docker Compose |
| Docker Compose | incluido en Docker Desktop | Ejecutar `docker compose up -d` |

Después de tener estas herramientas instaladas, `npm install` se usará más adelante para instalar las librerías propias del proyecto, como NestJS, Prisma, Next.js, OpenAI SDK, Jest, ESLint y otros paquetes declarados en los `package.json`.

Validar instalación local:

```bash
node -v
npm -v
git --version
docker compose version
```

Versiones usadas durante el desarrollo y pruebas del MVP:

```txt
Node.js v22.22.3
npm 10.9.8
```

Requisito importante:

```txt
La versión principal de Node.js debe ser 22.x tanto localmente como en Docker y GitHub Actions.
```

Esto evita diferencias entre:

```txt
desarrollo local
contenedor Docker de la API
pipeline de CI en GitHub Actions
```

Si `node -v` muestra una versión principal distinta, por ejemplo `v20.x` o `v24.x`, se recomienda instalar Node.js 22 LTS antes de continuar. Una forma simple de hacerlo en Windows es descargar el instalador LTS desde el sitio oficial de Node.js.

Docker Desktop debe estar iniciado antes de ejecutar:

```bash
docker compose up -d
```

Si Docker no está iniciado, los servicios locales de PostgreSQL, Redis y MinIO no podrán levantarse.

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

`apps/web` es el panel administrativo web del MVP. Incluye login, registro de tenant admin, dashboard del tenant, listado de documentos, visibilidad de uso y creación/listado de API keys desde una sesión JWT.

## Guía De Instalación Y Prueba Local

Esta guía está pensada para que el profesor o evaluador pueda levantar el MVP localmente y probar el flujo completo sin tener que deducir pasos intermedios.

La guía sigue una única secuencia:

```txt
1. Preparar el entorno
2. Levantar servicios locales
3. Preparar la base de datos
4. Iniciar la API
5. Crear tenant y API key
6. Subir e ingestar documentos
7. Consultar la API
8. Ejecutar el client demo
```

> [!IMPORTANT]
> Antes de iniciar, confirmar que Docker Desktop esté abierto y que Node.js sea versión 22.x.

### 1. Clonar El Repositorio

Desde una terminal:

```bash
git clone https://github.com/Janeitor/tenant-ai-platform.git
cd tenant-ai-platform
```

Si el proyecto ya está descargado, solo entrar a la carpeta raíz del repositorio antes de ejecutar los siguientes comandos.

### 2. Instalar Dependencias Del Proyecto

Ejecutar desde la raíz del repositorio:

```bash
npm install
```

Este comando instala las dependencias declaradas en el `package.json` principal y en los workspaces:

```txt
apps/api
apps/client-demo
apps/web
packages/shared
```

`npm install` instala librerías del proyecto como NestJS, Prisma, Next.js, OpenAI SDK, Jest, ESLint y tooling de Cloudflare/OpenNext. No instala Docker, PostgreSQL, Redis, MinIO ni configura variables de entorno.

### 3. Crear Archivo `.env`

El proyecto no committea secretos ni configuración local real. Por eso se debe crear un archivo `.env` desde `.env.example`.

En Linux, macOS o Git Bash:

```bash
cp .env.example .env
```

En Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Para una prueba local sin llamadas reales a OpenAI, usar:

```env
EMBEDDING_PROVIDER=local
LLM_PROVIDER_NAME=local
```

Para probar el flujo RAG con OpenAI, configurar además:

```env
EMBEDDING_PROVIDER=openai
LLM_PROVIDER_NAME=openai
OPENAI_API_KEY=your-api-key
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
OPENAI_MODEL=gpt-5-mini
EMBEDDING_DIMENSIONS=1536
```

No subir `.env` a Git.

### 4. Levantar Infraestructura Local

La API necesita servicios externos para funcionar localmente:

```txt
PostgreSQL + pgvector
Redis
MinIO
```

Estos servicios se levantan al mismo tiempo con Docker Compose:

```bash
docker compose up -d
```

Verificar que estén arriba:

```bash
docker compose ps
```

Si este comando falla, revisar que Docker Desktop esté abierto e iniciado.

### 5. Preparar Base De Datos Local

Con Docker funcionando y PostgreSQL iniciado, ejecutar:

```bash
npm run prisma:migrate --workspace @tenant-ai/api
npm run prisma:generate --workspace @tenant-ai/api
```

Estos comandos hacen dos cosas:

```txt
prisma:migrate
  -> crea o actualiza las tablas de la base de datos local

prisma:generate
  -> genera el cliente Prisma usado por la API
```

Después de ejecutar las migraciones, la base de datos debería contener tablas como `tenants`, `api_keys`, `documents`, `document_chunks` y `usage_logs`.

Para ver el detalle del modelo creado y la función de cada tabla, revisar la sección `Base De Datos Y Prisma`.

### 6. Ejecutar Validaciones Del Proyecto

Antes de iniciar la aplicación, se recomienda validar que el código compile y que los tests pasen:

```bash
npm run lint
npm run test
npm run build
```

En este punto, si las dependencias se instalaron correctamente, la base de datos fue preparada y el cliente Prisma fue generado, estos comandos deberían ejecutarse sin errores.

Los tests automatizados no deberían llamar APIs reales de OpenAI. Los providers externos se mockean en tests para que la validación local no dependa de saldo, conexión o credenciales reales de proveedores de IA.

Resultado esperado:

```txt
lint sin errores
tests pasando
build completado
```

### 7. Iniciar La API

```bash
npm run start:dev --workspace @tenant-ai/api
```

Mantener esta terminal abierta. La API debería quedar disponible en:

```txt
http://localhost:3000/api
```

En otra terminal, validar el healthcheck:

```powershell
Invoke-RestMethod http://localhost:3000/api/health
```

Respuesta esperada:

```txt
status: ok
service: tenant-ai-api
```

### 8. Registrar Tenant Admin Y Crear Una API Key

La configuración inicial del tenant se realiza desde el panel administrativo web incluido en `apps/web`. Esta vista representa la experiencia del administrador del cliente dentro del MVP.

> [!NOTE]
> En el MVP, el registro crea el tenant directamente para facilitar la evaluación local y demostrar el flujo completo sin intervención manual de un administrador global. En una versión productiva, la creación de tenants debería incorporar validación adicional, por ejemplo aprobación por `system_admin`, invitación controlada, verificación de email o validación de dominio corporativo.

Iniciar el panel en otra terminal:

```bash
npm run dev --workspace @tenant-ai/web
```

Abrir en el navegador:

```txt
http://localhost:3002
```

Flujo recomendado:

```txt
/register
  -> crea el tenant
  -> crea el usuario tenant_admin inicial
  -> inicia sesión en el panel

/dashboard
  -> muestra métricas iniciales del tenant
  -> confirma que el usuario está operando sobre el tenant correcto

/api-keys
  -> permite crear una API key para integrar la API RAG
  -> lista las API keys existentes mostrando solo metadatos seguros
```

La API key creada desde el panel se muestra en texto plano solo una vez. Debe copiarse en ese momento si se usará luego en `client-demo` o en una integración externa.

Conceptualmente, esa API key será enviada por los sistemas cliente en el header:

```txt
x-api-key: tai_...
```

La API key resuelve el tenant en backend. El cliente no debe enviar `tenantId`.

### 9. Subir E Ingestar Un Documento

La carga e ingestion de documentos se realiza desde la vista **Documentos** del panel administrativo. Esta vista permite al administrador del tenant subir archivos, revisar su estado e iniciar el procesamiento necesario para que el contenido quede disponible para consultas RAG.

Este proceso tiene dos pasos:

```txt
1. Upload
   -> guarda el archivo en object storage
   -> crea el registro del documento en la base de datos

2. Ingestion
   -> lee el archivo almacenado
   -> extrae texto
   -> divide el texto en chunks
   -> calcula tokenCount
   -> genera embeddings
   -> guarda los chunks y vectores en PostgreSQL + pgvector
```

Estados relevantes del documento:

| Estado | Significado | Acción esperada |
| --- | --- | --- |
| `uploaded` | El archivo fue almacenado y existe metadata en base de datos, pero todavía no tiene chunks ni embeddings | Puede ingestar |
| `processing` | La ingestion está en ejecución | No se debe iniciar otra ingestion simultánea |
| `ready` | La ingestion terminó correctamente y el documento ya puede participar en `/api/ask` | Queda disponible para consultas RAG |
| `failed` | La ingestion falló durante extracción, chunking, embeddings o persistencia | Puede reintentarse la ingestion |

Flujo recomendado en el panel:

```txt
/documents
  -> seleccionar un archivo text/plain o PDF
  -> presionar Subir documento
  -> verificar que el documento aparezca con estado uploaded
  -> presionar Ingestar
  -> esperar que el estado cambie a ready
```

La vista **Documentos** muestra nombre, tipo, tamaño, estado, fecha de creación y acciones disponibles para cada documento.

Los archivos PDF son soportados cuando contienen texto seleccionable. PDFs escaneados o basados solo en imágenes requieren OCR y están fuera del alcance actual del MVP.

La ingestion debe ejecutarse después del upload. Si un documento fue subido pero no ingestado, existe como archivo almacenado, pero todavía no puede ser consultado por `/api/ask` porque no tiene chunks ni embeddings disponibles para retrieval.

Si la ingestion falla, el backend marca el documento como `failed`. Desde el panel administrativo se puede presionar nuevamente la acción de ingestion para reintentar el procesamiento. Esto evita que un documento quede indefinidamente en `processing` y permite recuperar fallos temporales, por ejemplo errores de extracción, storage o embeddings.

```mermaid
flowchart TD
  Upload["Upload documento"] --> ObjectStorage["Guardar archivo en object storage"]
  Upload --> DocumentRow["Crear registro documents"]
  DocumentRow --> Ingest["POST /api/documents/:id/ingest"]
  Ingest --> Extract["Extraer texto"]
  Extract --> Chunk["Crear chunks"]
  Chunk --> Tokens["Calcular tokenCount"]
  Tokens --> Embeddings["Generar embeddings"]
  Embeddings --> Pgvector["Guardar chunks + vectores en PostgreSQL pgvector"]
  Pgvector --> Ready["Documento status = ready"]
```

### 10. Consultar La API

Hacer una pregunta:

```powershell
$response = Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3000/api/ask" `
  -Headers @{"x-api-key"=$apiKey} `
  -ContentType "application/json" `
  -Body '{"question":"Que informacion contiene el documento?","limit":5}'

$response | ConvertTo-Json -Depth 5
```

Comportamiento esperado:

```txt
respuesta basada en documentos
fuentes con documentName y chunkId
usage con provider/model/tokens/context metrics
```

Flujo interno simplificado de `/api/ask`:

```mermaid
flowchart TD
  Ask["POST /api/ask"] --> Auth["Validar x-api-key"]
  Auth --> Tenant["Resolver tenant"]
  Tenant --> Embed["Crear embedding de la pregunta"]
  Embed --> Search["Buscar chunks por tenant en pgvector"]
  Search --> Threshold["Aplicar MIN_RETRIEVAL_SIMILARITY"]
  Threshold --> Context["Seleccionar contexto dentro del presupuesto"]
  Context --> HasContext{"Hay contexto?"}
  HasContext -->|No| NoContext["Respuesta controlada sin llamar LLM"]
  HasContext -->|Si| LLM["LLM Provider"]
  LLM --> Usage["Persistir usage_logs"]
  Usage --> Answer["Respuesta con answer + sources + usage"]
```

> [!TIP]
> `/api/retrieval/search` sirve para inspeccionar qué chunks recupera el sistema y ver sus valores de `similarity`. `/api/ask` es el endpoint final para obtener una respuesta generada.

### 11. Revisar Usage Logs

```powershell
$usage = Invoke-RestMethod `
  -Method Get `
  -Uri "http://localhost:3000/api/usage?page=1&limit=5" `
  -Headers @{"x-api-key"=$apiKey}

$usage | ConvertTo-Json -Depth 5
```

Los usage logs están acotados por tenant e incluyen métricas de tokens/contexto cuando están disponibles.

### 12. Ejecutar El Client Demo

En este punto ya existe:

```txt
tenant creado
API key guardada en $apiKey
documento subido
documento ingestado
API respondiendo preguntas
```

Ahora se puede configurar el client demo.

El archivo `apps/client-demo/.env.local` no viene incluido en el repositorio porque contiene configuración local y una API key. Debe crearse manualmente.

Crear:

```txt
apps/client-demo/.env.local
```

Contenido del archivo:

```env
TENANT_AI_API_URL=http://localhost:3000/api
TENANT_AI_API_KEY=tai_your_tenant_api_key_created_in_step_8
```

El valor `TENANT_AI_API_KEY` debe reemplazarse por la API key creada en el paso `8. Crear Un Tenant Y Una API Key`.

Si se está siguiendo el flujo en PowerShell y la variable `$apiKey` sigue disponible, se puede ver su valor con:

```powershell
$apiKey
```

Copiar ese valor en `TENANT_AI_API_KEY`.

Iniciar el demo app:

```bash
npm run dev --workspace @tenant-ai/client-demo
```

Abrir:

```txt
http://localhost:3001
```

El demo simula una aplicación cliente para una notaría. Llama a su propia ruta server-side de Next.js, que luego llama a la API de Tenant AI con `x-api-key`. El navegador nunca ve la API key del tenant.

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

## Admin Web

El proyecto incluye un panel administrativo web en:

```txt
apps/web
```

Este panel representa la experiencia del administrador del tenant. En el MVP permite:

- crear una cuenta administradora de tenant
- iniciar sesión con email y password
- navegar mediante un menú lateral de administración
- identificar el tenant activo desde todas las pantallas del panel
- consultar un dashboard básico del tenant
- ver métricas de documentos, chunks y usage logs
- crear API keys para integrar la API RAG desde sistemas externos
- listar API keys existentes mostrando solo metadatos seguros
- subir documentos del tenant desde el panel
- iniciar la ingestion de documentos desde el panel
- listar documentos pertenecientes al tenant autenticado
- revisar uso reciente desde una vista dedicada

El panel usa JWT y no reemplaza el consumo API-first con `x-api-key`. La API key se usa para integraciones externas; el JWT se usa para sesiones humanas dentro del panel.

Crear el archivo local:

```txt
apps/web/.env.local
```

Contenido:

```env
TENANT_AI_API_URL=http://localhost:3000/api
```

Ejecutar:

```bash
npm run dev --workspace @tenant-ai/web
```

Abrir:

```txt
http://localhost:3002
```

Flujo esperado:

```txt
/register
  -> crea tenant + tenant_admin
  -> guarda JWT en el navegador
  -> redirige a /dashboard

/login
  -> obtiene JWT
  -> redirige a /dashboard

/dashboard
  -> consulta summary del tenant autenticado
  -> muestra métricas y uso reciente

/api-keys
  -> permite crear API keys del tenant
  -> muestra la API key en texto plano solo una vez
  -> lista API keys existentes sin exponer keyHash ni la API key completa

/documents
  -> permite subir documentos text/plain o PDF
  -> permite iniciar ingestion de documentos subidos
  -> permite reintentar ingestion cuando un documento queda failed
  -> lista documentos del tenant autenticado
  -> muestra nombre, MIME type, tamaño, estado y fecha de creación

/usage
  -> muestra consultas recientes del tenant
  -> muestra provider, modelo, tokens y chunks seleccionados
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
User
```

La tabla `tenants` es la entidad base para el aislamiento multi-tenant. Las entidades de negocio como API keys, documentos, chunks, usage logs y usuarios administradores deben mantener relación con el tenant cuando corresponda.

Después de ejecutar:

```bash
npm run prisma:migrate --workspace @tenant-ai/api
```

la base de datos local debe contener, como mínimo, estas tablas:

| Tabla | Propósito |
| --- | --- |
| `_prisma_migrations` | Registro interno de Prisma para saber qué migraciones ya fueron aplicadas |
| `tenants` | Empresas o clientes que usan la plataforma |
| `api_keys` | API keys asociadas a tenants para autenticar llamadas protegidas |
| `users` | Usuarios humanos para futuros paneles administrativos, con rol `tenant_admin` o `system_admin` |
| `documents` | Metadata de documentos subidos por cada tenant |
| `document_chunks` | Fragmentos de texto extraídos de documentos, junto con `tokenCount` y embeddings |
| `usage_logs` | Registro de uso de `/api/ask`, tokens, provider, modelo y métricas de contexto |

Relación conceptual principal:

```mermaid
erDiagram
  tenants ||--o{ api_keys : owns
  tenants ||--o{ users : owns
  tenants ||--o{ documents : owns
  tenants ||--o{ document_chunks : owns
  tenants ||--o{ usage_logs : owns
  documents ||--o{ document_chunks : contains
```

Esto permite validar visualmente que la migración fue aplicada correctamente. Por ejemplo, al abrir Prisma Studio o un cliente PostgreSQL, deberían verse esas tablas antes de comenzar a probar uploads, ingestion o consultas RAG.

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

## Autenticación JWT Para Paneles Administrativos

La API también incluye una base de autenticación JWT para futuros paneles web administrativos.

Este mecanismo está pensado para usuarios humanos:

```txt
tenant_admin
system_admin
```

No reemplaza el contrato público `x-api-key`. Los endpoints de integración como `/api/ask`, `/api/documents`, `/api/retrieval/search` y `/api/usage` siguen protegidos por `ApiKeyAuthGuard`.

Endpoints actuales de autenticación admin:

```txt
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
GET  /api/admin/tenant/summary
POST /api/admin/tenant/api-keys
GET  /api/admin/tenant/api-keys
GET  /api/admin/tenant/documents
POST /api/admin/tenant/documents/upload
POST /api/admin/tenant/documents/:documentId/ingest
```

`POST /api/auth/register` crea un tenant y un usuario `tenant_admin` inicial para ese tenant. Este flujo se usa como base MVP para habilitar acceso administrativo futuro.

En el alcance actual, este registro es directo para simplificar la prueba del MVP. No implementa todavía aprobación de tenants, verificación de email ni validación de dominio corporativo. Para un escenario productivo B2B, este flujo debería endurecerse con una de estas alternativas:

- creación de tenants solo por un usuario `system_admin`
- registro inicial con estado `pending`
- aprobación manual antes de habilitar el tenant
- invitaciones controladas para administradores del cliente
- verificación de email o dominio de la empresa

Ejemplo de registro:

```powershell
$registerBody = @{
  name = "Admin Demo"
  email = "admin-demo@example.com"
  password = "password123"
  companyName = "Admin Demo Company"
} | ConvertTo-Json

$registerResponse = Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3000/api/auth/register" `
  -ContentType "application/json" `
  -Body $registerBody
```

La respuesta devuelve:

```txt
accessToken
user
```

El `accessToken` debe enviarse en rutas admin protegidas usando:

```txt
Authorization: Bearer <accessToken>
```

Ejemplo para consultar el usuario autenticado:

```powershell
$adminToken = $registerResponse.accessToken

$meResponse = Invoke-RestMethod `
  -Method Get `
  -Uri "http://localhost:3000/api/auth/me" `
  -Headers @{"Authorization"="Bearer $adminToken"}

$meResponse | ConvertTo-Json -Depth 5
```

Variables requeridas:

```env
JWT_SECRET=change-me-in-local-env
JWT_EXPIRES_IN=1d
```

`JWT_SECRET` debe ser un secreto largo y distinto por ambiente. No debe subirse a Git.

Endpoints administrativos del tenant:

```txt
GET /api/admin/tenant/summary
  -> requiere Authorization: Bearer <accessToken>
  -> requiere rol tenant_admin
  -> devuelve tenant, métricas y últimos usage logs

POST /api/admin/tenant/api-keys
  -> requiere Authorization: Bearer <accessToken>
  -> requiere rol tenant_admin
  -> crea una API key para el tenant autenticado

GET /api/admin/tenant/api-keys
  -> requiere Authorization: Bearer <accessToken>
  -> requiere rol tenant_admin
  -> lista API keys del tenant autenticado
  -> devuelve solo id, nombre, prefijo, estado y fecha de creación

GET /api/admin/tenant/documents
  -> requiere Authorization: Bearer <accessToken>
  -> requiere rol tenant_admin
  -> lista documentos del tenant autenticado

POST /api/admin/tenant/documents/upload
  -> requiere Authorization: Bearer <accessToken>
  -> requiere rol tenant_admin
  -> sube un archivo para el tenant autenticado
  -> deja el documento en estado uploaded

POST /api/admin/tenant/documents/:documentId/ingest
  -> requiere Authorization: Bearer <accessToken>
  -> requiere rol tenant_admin
  -> procesa el documento del tenant autenticado
  -> extrae texto, crea chunks, genera embeddings y deja el documento en ready
```

En estos endpoints, el `tenantId` se resuelve desde el JWT. El cliente no envía `tenantId` en URL, query params ni body.

Ejemplo para crear una API key desde sesión admin:

```powershell
$apiKeyFromAdmin = Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3000/api/admin/tenant/api-keys" `
  -Headers @{"Authorization"="Bearer $adminToken"} `
  -ContentType "application/json" `
  -Body '{"name":"Dashboard generated key"}'

$apiKeyFromAdmin | ConvertTo-Json -Depth 5
```

La respuesta incluye `apiKey` en texto plano solo una vez. El panel debe mostrarla para copia inmediata y advertir que no se volverá a mostrar.

Ejemplo para listar API keys existentes desde sesión admin:

```powershell
$tenantApiKeys = Invoke-RestMethod `
  -Method Get `
  -Uri "http://localhost:3000/api/admin/tenant/api-keys" `
  -Headers @{"Authorization"="Bearer $adminToken"}

$tenantApiKeys | ConvertTo-Json -Depth 5
```

Este endpoint no devuelve la API key completa ni el hash almacenado. Solo entrega información segura para administración visual, como nombre, prefijo, estado y fecha de creación.

Ejemplo para subir un documento desde sesión admin:

```powershell
$uploadedDocument = curl.exe -X POST `
  "http://localhost:3000/api/admin/tenant/documents/upload" `
  -H "Authorization: Bearer $adminToken" `
  -F "file=@demo-files/sample-document.txt"

$uploadedDocumentObject = $uploadedDocument | ConvertFrom-Json
```

Ejemplo para ingestar el documento subido:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "http://localhost:3000/api/admin/tenant/documents/$($uploadedDocumentObject.id)/ingest" `
  -Headers @{"Authorization"="Bearer $adminToken"}
```

La subida y la ingestion se mantienen separadas de forma intencional. Esto permite mostrar en el MVP las dos etapas del flujo documental: primero se registra y almacena el archivo; luego se procesa para extracción de texto, chunking y embeddings.

Cuando la ingestion termina correctamente, el documento queda en `ready`. Si ocurre un error durante el procesamiento, queda en `failed` y el administrador del tenant puede reintentar la ingestion desde el panel.

## Seguimiento De Vulnerabilidades

Los hallazgos de vulnerabilidades durante el desarrollo están documentados en:

```txt
docs/vulnerability-analysis.md
```

Esto incluye el hallazgo actual de `npm audit` relacionado con tooling de desarrollo de Prisma y la razón para monitorearlo en vez de aplicar un downgrade automático incompatible.

## Estado De Documentación

Este README se actualizará cuando cambien setup, variables de entorno, endpoints de API e instrucciones de despliegue.
