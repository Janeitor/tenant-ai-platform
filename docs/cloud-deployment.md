# Despliegue Cloud Del MVP

Este documento describe el alcance cloud del MVP de Tenant AI.

La guia principal y reproducible del proyecto es el flujo local documentado en `README.md`. La version cloud se mantiene como una demostracion tecnica complementaria para mostrar que la arquitectura puede ejecutarse fuera del equipo local, pero no representa todavia una configuracion productiva final.

## Alcance Validado

El MVP fue probado con una arquitectura cloud acotada:

```txt
API NestJS
  -> Railway
  -> ejecutada desde Dockerfile

Base de datos
  -> PostgreSQL administrado en Railway
  -> extension pgvector habilitada

Storage de documentos
  -> Cloudflare R2
  -> compatible con S3

IA
  -> OpenAI para embeddings
  -> OpenAI para generacion de respuestas

Client demo
  -> puede ejecutarse localmente apuntando a la API cloud
  -> fue probado como despliegue demostrativo en Cloudflare Workers/OpenNext

CI
  -> GitHub Actions para lint, tests, build, Docker build y audit basico

IaC
  -> Terraform acotado a Cloudflare R2
```

## Estado Actual

El despliegue cloud actual debe entenderse como una validacion tecnica:

- La API puede correr en Railway como contenedor Docker.
- PostgreSQL con pgvector puede alojar datos relacionales y embeddings.
- Cloudflare R2 puede almacenar documentos subidos.
- OpenAI puede generar embeddings y respuestas en el flujo RAG.
- El client-demo puede consumir la API cloud cuando recibe `TENANT_AI_API_URL` y `TENANT_AI_API_KEY`.
- Terraform representa el bucket R2, pero no administra toda la infraestructura.

El flujo local sigue siendo el entorno recomendado para revisar el MVP completo con API, panel admin, client-demo, Redis, MinIO, PostgreSQL y migraciones Prisma.

## Punto Importante Sobre Ingestion Asincronica

La ingestion actual del MVP usa BullMQ y Redis.

En local, Redis esta definido en `docker-compose.yml`.

Para ejecutar la ingestion asincronica en cloud se requiere agregar un Redis administrado o un servicio equivalente, y configurar la API con:

```env
REDIS_HOST=<redis-host>
REDIS_PORT=<redis-port>
```

Sin Redis disponible para la API cloud, la carga de documentos puede funcionar, pero la ingestion asincronica no debe considerarse completamente operativa.

## Railway API

Configuracion esperada del servicio API:

```txt
Source repo: Janeitor/tenant-ai-platform
Branch: main
Root directory: /
Builder: Dockerfile
Dockerfile path: Dockerfile
Healthcheck path: /api/health
```

La API usa el prefijo global:

```txt
https://<railway-domain>/api
```

Variables principales del servicio:

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

REDIS_HOST=<redis-host>
REDIS_PORT=<redis-port>

EMBEDDING_PROVIDER=openai
EMBEDDING_DIMENSIONS=1536
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
LLM_PROVIDER_NAME=openai
OPENAI_MODEL=gpt-5-mini
OPENAI_API_KEY=<secret>

MIN_RETRIEVAL_SIMILARITY=
MAX_CONTEXT_TOKENS=8000
MAX_CHUNKS_PER_QUERY=5
```

No se deben committear secretos. Todos los valores sensibles deben vivir en variables del proveedor cloud o en un secret manager futuro.

## PostgreSQL En Railway

La extension `pgvector` debe estar habilitada:

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

Las migraciones Prisma no son responsabilidad de Terraform. Para produccion se debe usar:

```txt
prisma migrate deploy
```

El MVP local ya incluye un servicio `prisma-migrate` en Docker Compose. En cloud, este paso debe quedar como parte de un proceso controlado de release o pre-deploy.

## Cloudflare R2

Cloudflare R2 se usa como object storage compatible con S3.

Bucket usado:

```txt
tenant-ai-documents
```

El adapter actual espera estas variables:

```env
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=tenant-ai-documents
S3_ACCESS_KEY=<r2-access-key-id>
S3_SECRET_KEY=<r2-secret-access-key>
```

Los documentos se almacenan con keys acotadas por tenant:

```txt
{tenantId}/documents/{timestamp}-{uuid}-{safeFileName}
```

## Terraform

El MVP incluye una configuracion inicial de Terraform:

```txt
infra/terraform/cloudflare
```

Alcance actual:

```txt
cloudflare_r2_bucket.documents
  -> tenant-ai-documents
```

El bucket R2 existente fue importado al estado local de Terraform y validado con:

```txt
terraform plan
  -> No changes. Your infrastructure matches the configuration.
```

Archivos committeados:

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

## Client Demo Cloud

El client-demo puede apuntar a una API cloud usando:

```env
TENANT_AI_API_URL=https://<railway-domain>/api
TENANT_AI_API_KEY=<tenant-api-key>
```

La API key del tenant debe configurarse como secret. No debe exponerse en el navegador.

El despliegue con Cloudflare Workers/OpenNext fue tratado como una validacion demostrativa. Para una version cloud mas estable del MVP se recomienda evaluar contenedores por workspace o un flujo CI/CD con imagenes publicadas en un registry.

## CI Con GitHub Actions

El workflow actual valida calidad basica:

```txt
npm ci
prisma generate
npm run lint
npm run test
npm run build
docker build
npm audit
```

GitHub Actions hoy funciona como gate de calidad, no como sistema completo de despliegue productivo.

## Mejoras Futuras

Antes de considerar la nube como entorno productivo se recomienda:

- publicar imagenes Docker por workspace en un container registry
- desplegar API, admin-web y client-demo desde imagenes versionadas
- agregar Redis administrado para ingestion asincronica cloud
- mover migraciones Prisma a un paso controlado de release
- ampliar Terraform a recursos adicionales si resulta practico
- incorporar observabilidad, alertas y control de costos
- definir estrategia de secretos y rotacion

