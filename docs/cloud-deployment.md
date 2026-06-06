# Despliegue Cloud

Este documento describe el despliegue cloud actual validado para el MVP de Tenant AI.

El objetivo de este despliegue es demostrar que la plataforma puede ejecutarse fuera del entorno local de desarrollo usando servicios cloud administrados, manteniendo la misma arquitectura API-first y multi-tenant.

## Target Cloud

Target actual del MVP:

```txt
Railway
  -> API NestJS ejecutándose desde Dockerfile
  -> PostgreSQL con pgvector

Cloudflare
  -> R2 object storage para documentos subidos
  -> Workers deployment para la aplicación customer demo

OpenAI
  -> embeddings de texto
  -> generación de respuestas con LLM
```

Adiciones DevOps planificadas:

```txt
GitHub Actions
  -> npm ci
  -> generación del cliente Prisma
  -> lint/test/build
  -> validación de imagen Docker
  -> npm audit --audit-level=high
  -> futuro Prisma migrate deploy

Terraform
  -> bucket Cloudflare R2 representado como infrastructure as code
  -> futura expansión de infrastructure as code
```

## API En Railway

El service de API se despliega desde el repositorio usando el `Dockerfile` ubicado en la raíz.

Configuración del service en Railway:

```txt
Source repo: Janeitor/tenant-ai-platform
Branch: main
Root directory: /
Builder: Dockerfile
Dockerfile path: Dockerfile
Start command: empty
Healthcheck path: /api/health
```

El comando de inicio del contenedor está definido en el Dockerfile:

```txt
node dist/src/main.js
```

La API NestJS lee el puerto de runtime desde:

```env
PORT=3000
```

Railway expone el service mediante un dominio público generado. La URL base de la API usa el prefijo global de NestJS:

```txt
https://<railway-domain>/api
```

## PostgreSQL En Railway

El service de base de datos es Railway PostgreSQL.

La extensión `pgvector` fue habilitada y validada con:

```sql
CREATE EXTENSION IF NOT EXISTS vector;

SELECT extname
FROM pg_extension
WHERE extname = 'vector';
```

Resultado esperado:

```txt
vector
```

El service de API usa la referencia interna de base de datos de Railway:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

Para migraciones manuales locales contra la base de datos cloud, se debe usar la URL pública de base de datos de Railway:

```txt
DATABASE_PUBLIC_URL
```

En PowerShell, se asigna temporalmente a `DATABASE_URL` porque Prisma espera ese nombre de variable:

```powershell
$env:DATABASE_URL = "postgresql://..."
npm run prisma:migrate --workspace @tenant-ai/api
npm run prisma:generate --workspace @tenant-ai/api
Remove-Item Env:DATABASE_URL
```

Este paso manual de migración es temporal. El flujo futuro orientado a producción debe usar:

```txt
prisma migrate deploy
```

desde CI/CD o desde un paso controlado de despliegue.

## Cloudflare R2

Cloudflare R2 se usa como object storage compatible con S3 para documentos subidos.

Bucket actual:

```txt
tenant-ai-documents
```

La API usa el adapter de storage existente con las siguientes variables en Railway:

```env
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=tenant-ai-documents
S3_ACCESS_KEY=<r2-access-key-id>
S3_SECRET_KEY=<r2-secret-access-key>
```

Detalle importante de nombres:

```txt
El S3StorageAdapter actual espera S3_ACCESS_KEY y S3_SECRET_KEY.
No lee S3_ACCESS_KEY_ID ni S3_SECRET_ACCESS_KEY.
```

Los documentos subidos se almacenan con keys acotadas por tenant:

```txt
{tenantId}/documents/{timestamp}-{uuid}-{safeFileName}
```

## Terraform Como Infrastructure As Code

El MVP incluye una configuración inicial de Terraform para recursos Cloudflare:

```txt
infra/terraform/cloudflare
```

Alcance actual:

```txt
cloudflare_r2_bucket.documents
  -> tenant-ai-documents
```

Esto significa que el bucket Cloudflare R2 usado por la API está representado como infrastructure as code. El bucket ya existía durante la configuración cloud del MVP, por lo que fue importado al estado de Terraform en lugar de ser recreado.

Resultado Terraform validado:

```txt
terraform plan
  -> No changes. Your infrastructure matches the configuration.
```

Archivos Terraform committeados:

```txt
infra/terraform/cloudflare/.terraform.lock.hcl
infra/terraform/cloudflare/README.md
infra/terraform/cloudflare/main.tf
infra/terraform/cloudflare/outputs.tf
infra/terraform/cloudflare/terraform.tfvars.example
infra/terraform/cloudflare/variables.tf
```

Archivos intencionalmente no committeados:

```txt
infra/terraform/cloudflare/.terraform/
infra/terraform/cloudflare/terraform.tfstate
infra/terraform/cloudflare/terraform.tfvars
```

Razón:

```txt
.terraform/ contiene datos locales de provider/cache
terraform.tfstate contiene estado real de infraestructura
terraform.tfvars puede contener account IDs, tokens o valores específicos del entorno
```

Terraform se usa actualmente solo para recursos de infraestructura. No administra migraciones de Prisma, datos de tenants, API keys ni secretos de aplicación.

## Configuración OpenAI

El despliegue cloud usa OpenAI para embeddings y generación de respuestas.

Variables de Railway para la API:

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

La API key de OpenAI debe crearse en OpenAI Platform. Una suscripción de ChatGPT Plus por sí sola no permite usar la API.

## Client Demo En Cloudflare Workers

La aplicación customer demo se despliega en Cloudflare Workers usando OpenNext para Cloudflare.

Esto es necesario porque el demo no es un sitio puramente estático. Incluye una ruta server-side de Next.js:

```txt
apps/client-demo/src/app/api/ask/route.ts
```

Esa ruta mantiene la API key del tenant fuera del navegador y reenvía preguntas a la API de Railway con:

```txt
x-api-key: tai_...
```

Archivos implementados:

```txt
apps/client-demo/open-next.config.ts
apps/client-demo/wrangler.jsonc
```

Scripts de build del client demo:

```txt
npm run build:cloudflare --workspace @tenant-ai/client-demo
npm run preview:cloudflare --workspace @tenant-ai/client-demo
npm run deploy:cloudflare --workspace @tenant-ai/client-demo
```

Configuración de deployment del Cloudflare Worker:

```txt
Repository: Janeitor/tenant-ai-platform
Path: /
Build command: npm run build:cloudflare --workspace @tenant-ai/client-demo
Deploy command: npx wrangler deploy --config apps/client-demo/wrangler.jsonc
```

Variables de runtime:

```env
TENANT_AI_API_URL=https://<railway-domain>/api
TENANT_AI_API_KEY=<tenant-api-key>
```

Requisito de seguridad:

```txt
TENANT_AI_API_KEY debe configurarse como secret de Cloudflare.
TENANT_AI_API_URL puede quedar como plaintext.
```

Patrón validado de URL pública del demo:

```txt
https://<worker-name>.<cloudflare-account>.workers.dev
```

El demo desplegado fue validado haciendo una pregunta desde la UI tipo intranet notarial y recibiendo una respuesta desde la API de Railway usando retrieval acotado al tenant.

## Variables Requeridas En Railway Para La API

El service de API requiere:

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

No committear secretos. Configurarlos solo mediante variables de Railway o mediante un futuro secret manager.

## Flujo Cloud Validado

El siguiente flujo fue validado en el entorno cloud:

```txt
1. Healthcheck de la API en Railway
2. Migraciones Prisma aplicadas a Railway PostgreSQL
3. Tenant creado
4. API key del tenant creada
5. Endpoint protegido de documentos accedido con x-api-key
6. PDF subido mediante la API en Railway
7. PDF almacenado en Cloudflare R2
8. Documento ingestado
9. Texto extraído desde PDF
10. Chunks creados
11. Embeddings generados con OpenAI
12. Vectores almacenados en PostgreSQL pgvector
13. /api/ask respondió usando contexto del tenant
14. /api/usage devolvió usage logs persistidos
15. El client demo en Cloudflare Worker llamó a la API de Railway mediante una ruta server-side
16. La API key del tenant se mantuvo configurada como secret de Cloudflare
```

Comandos de validación de ejemplo:

```powershell
$apiUrl = "https://<railway-domain>/api"

Invoke-RestMethod "$apiUrl/health"
```

Crear un tenant:

```powershell
$tenant = Invoke-RestMethod `
  -Method Post `
  -Uri "$apiUrl/tenants" `
  -ContentType "application/json" `
  -Body '{"name":"Notaria Demo","slug":"notaria-demo"}'
```

Crear una API key de tenant:

```powershell
$apiKeyResponse = Invoke-RestMethod `
  -Method Post `
  -Uri "$apiUrl/tenants/$($tenant.id)/api-keys" `
  -ContentType "application/json" `
  -Body '{"name":"Client demo key"}'
```

Subir un PDF:

```powershell
$document = curl.exe -X POST `
  "$apiUrl/documents/upload" `
  -H "x-api-key: $apiKey" `
  -F "file=@demo-files/DERECHO-NOTARIAL-CHILENO.pdf"

$documentObject = $document | ConvertFrom-Json
```

Ingestar el documento:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri "$apiUrl/documents/$($documentObject.id)/ingest" `
  -Headers @{"x-api-key"=$apiKey}
```

Hacer una pregunta:

```powershell
$response = Invoke-RestMethod `
  -Method Post `
  -Uri "$apiUrl/ask" `
  -Headers @{"x-api-key"=$apiKey} `
  -ContentType "application/json" `
  -Body '{"question":"Que es el derecho notarial chileno?","limit":5}'

$response | ConvertTo-Json -Depth 5
```

Revisar usage logs:

```powershell
$usage = Invoke-RestMethod `
  -Method Get `
  -Uri "$apiUrl/usage?page=1&limit=5" `
  -Headers @{"x-api-key"=$apiKey}

$usage | ConvertTo-Json -Depth 5
```

## Pasos Manuales Actuales

El despliegue cloud actual todavía incluye pasos manuales:

```txt
setup del service en Railway
setup del bucket Cloudflare R2
creación del R2 API token
configuración de variables en Railway
configuración de variables/secrets en Cloudflare Worker
migraciones Prisma desde terminal local usando DATABASE_PUBLIC_URL
```

Estos pasos son aceptables para la primera validación cloud, pero deben automatizarse o documentarse como pasos controlados de release antes de una entrega productiva.

## CI Con GitHub Actions

El proyecto incluye un workflow de CI:

```txt
.github/workflows/ci.yml
```

Se ejecuta en:

```txt
push a main
pull_request a main
```

Pasos de validación actuales:

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

El paso de generación del cliente Prisma es requerido porque:

```txt
apps/api/generated/prisma
```

está intencionalmente ignorado por Git. CI se ejecuta en una máquina limpia, por lo que el cliente generado debe recrearse antes de que tests y builds puedan importar:

```txt
#prisma-client
```

El workflow usa un `DATABASE_URL` dummy para la generación de Prisma. `prisma generate` necesita un formato válido de URL de base de datos mediante la configuración de Prisma 7, pero no necesita conectarse a la base de datos para generar el cliente.

Política de seguridad en CI:

```txt
npm audit --audit-level=high
```

Esto significa que vulnerabilidades high y critical fallan CI. Los hallazgos moderate conocidos se registran en `docs/vulnerability-analysis.md` y actualmente no bloquean el pipeline MVP porque sus correcciones automáticas requieren downgrades incompatibles.

## Automatización Futura

Mejoras DevOps recomendadas:

```txt
GitHub Actions
  -> mantener CI como gate de validación
  -> opcionalmente publicar imágenes Docker en un container registry

Prisma deployment
  -> agregar script prisma:migrate:deploy
  -> ejecutar prisma migrate deploy en CI/CD o Railway pre-deploy

Terraform
  -> el bucket Cloudflare R2 ya está representado en infra/terraform/cloudflare
  -> administrar recursos de Cloudflare Worker si resulta práctico
  -> documentar variables de provider y decisión de remote state
  -> considerar remote state antes de usar Terraform colaborativamente
```

Las migraciones Prisma no deben administrarse con Terraform. Terraform administra recursos de infraestructura; Prisma administra cambios de schema de la base de datos de aplicación.
