# Arquitectura

## Visión General

TenantAI Platform es una plataforma de IA empresarial multi-tenant que entrega capacidades de Retrieval-Augmented Generation (RAG) mediante una arquitectura API-first.

El sistema permite a las empresas:
- subir documentos internos
- generar embeddings
- realizar búsqueda semántica
- consultar conocimiento usando LLMs
- aislar información por tenant

---

## Arquitectura De Alto Nivel

```text
Cliente
  |
API Gateway
  |
Auth/API Key
  |
Tenant Resolver
  |
Retrieval Service
  |
PostgreSQL + pgvector
  |
LLM Provider
  |
Respuesta con fuentes
```

---

## Arquitectura Backend

El backend sigue una arquitectura modular usando NestJS.

Módulos:
- auth
- tenants
- api-keys
- documents
- ingestion
- embeddings
- retrieval
- chat
- usage

---

## Demo De Integración De Cliente

El repositorio incluye `apps/client-demo`, una aplicación cliente de ejemplo usada para demostrar la integración API-first.

Aunque vive en el mismo monorepo para la demo del TFM, arquitectónicamente se trata como un sistema externo de un cliente:

- no importa servicios backend desde `apps/api`
- no accede a Prisma ni a la base de datos
- no conoce el `tenantId`
- llama a Tenant AI mediante HTTP
- mantiene la API key del tenant en variables de entorno server-side

El flujo de integración es:

```txt
Navegador del cliente
  |
Página client demo
  |
Ruta server del client demo
  |
Tenant AI API /api/ask con x-api-key
  |
Respuesta RAG acotada al tenant
```

Esto refleja cómo un backend real de cliente puede consumir Tenant AI manteniendo la API key del tenant fuera del navegador.

---

## Panel Administrativo Web

`apps/web` implementa el panel administrativo del tenant para el MVP.

Arquitectónicamente usa JWT, no `x-api-key`:

```txt
Navegador admin
  |
apps/web login/register
  |
Rutas server-side de Next.js
  |
Tenant AI API /api/auth/*
  |
JWT para sesión admin
  |
Dashboard tenant admin
  |
/api/admin/tenant/summary
/api/admin/tenant/api-keys
/api/admin/tenant/documents
```

El panel usa un menú lateral con secciones separadas:

```txt
/dashboard
  -> métricas generales y uso reciente

/api-keys
  -> creación y listado seguro de API keys del tenant

/documents
  -> subida, ingestion y listado de documentos del tenant

/usage
  -> vista dedicada de uso reciente
```

El menú lateral identifica el tenant activo para que el administrador sepa sobre qué empresa está operando. El dashboard y las páginas administrativas no permiten elegir `tenantId`. Todas las acciones administrativas del tenant usan el `tenantId` resuelto desde el JWT.

La creación de API keys desde el panel reutiliza `ApiKeysService`, manteniendo la lógica de hashing, `API_KEY_PEPPER`, prefijo visible y entrega de la API key en texto plano solo una vez.

El listado de API keys consume `GET /api/admin/tenant/api-keys` y devuelve solo metadatos seguros: identificador, nombre, prefijo, fecha de creación y estado de revocación. No expone `keyHash` ni la API key completa.

La vista de documentos consume `GET /api/admin/tenant/documents` y muestra solo documentos filtrados por el tenant del JWT. No expone `storageKey` ni permite consultar documentos de otros tenants.

La subida administrativa de documentos consume `POST /api/admin/tenant/documents/upload`. Este endpoint reutiliza `DocumentsService.upload`, por lo que mantiene las mismas reglas de storage, MIME type, tamaño máximo y propiedad por tenant que el endpoint público con `x-api-key`.

La ingestion administrativa consume `POST /api/admin/tenant/documents/:documentId/ingest`. Este endpoint reutiliza `IngestionService.ingestDocument`, por lo que el procesamiento sigue filtrando por `tenantId`, extrae texto, genera chunks, calcula embeddings y actualiza el estado del documento a `ready`.

Si ocurre un error durante ingestion, `IngestionService` actualiza el documento a `failed` antes de relanzar el error. Esto evita dejar documentos bloqueados en `processing` y permite que el panel administrativo ofrezca reintento de ingestion para documentos fallidos.

Estados operativos del documento:

```txt
uploaded
  -> archivo almacenado, pendiente de ingestion

processing
  -> ingestion en curso

ready
  -> chunks y embeddings disponibles para retrieval

failed
  -> ingestion fallida, permite reintento
```

---

## Contratos De Autenticación

La plataforma mantiene dos mecanismos de autenticación con propósitos distintos:

```txt
x-api-key
  -> consumo externo de la API RAG
  -> usado por clientes, sistemas e integraciones
  -> resuelve tenantId desde ApiKeyAuthGuard

JWT
  -> uso humano en paneles web administrativos
  -> usado por tenant_admin y system_admin
  -> resuelve usuario, rol y tenantId desde sesión autenticada
```

El flujo `x-api-key` existente es parte del contrato público del producto y debe mantenerse estable. Los paneles administrativos con JWT se agregan como una capa adicional para administración web, no como reemplazo del consumo externo de la API.

Endpoints JWT actuales:

```txt
POST /api/auth/register
  -> crea tenant + usuario tenant_admin inicial
  -> devuelve accessToken

POST /api/auth/login
  -> valida email/password
  -> devuelve accessToken

GET /api/auth/me
  -> requiere Authorization: Bearer <token>
  -> devuelve usuario autenticado, rol y tenantId

GET /api/admin/tenant/summary
  -> requiere JWT tenant_admin
  -> devuelve métricas del tenant autenticado

POST /api/admin/tenant/api-keys
  -> requiere JWT tenant_admin
  -> crea API key para el tenant autenticado

GET /api/admin/tenant/api-keys
  -> requiere JWT tenant_admin
  -> lista API keys del tenant autenticado sin exponer secretos

GET /api/admin/tenant/documents
  -> requiere JWT tenant_admin
  -> lista documentos del tenant autenticado

POST /api/admin/tenant/documents/upload
  -> requiere JWT tenant_admin
  -> sube documento para el tenant autenticado

POST /api/admin/tenant/documents/:documentId/ingest
  -> requiere JWT tenant_admin
  -> ingesta documento del tenant autenticado
```

El guard JWT valida el bearer token, resuelve el usuario autenticado desde el payload y adjunta `request.user`. Las rutas administrativas futuras deben usar JWT y validación de roles en backend.

Reglas:
- no cambiar el contrato actual de `/api/ask` con `x-api-key`
- no hacer que `/api/ask` dependa exclusivamente de JWT
- no eliminar endpoints existentes usados por integraciones externas
- mantener `ApiKeyAuthGuard` para consumo API-first
- aplicar guards JWT/roles solo para paneles administrativos y rutas de administración

---

## Estrategia Multi-Tenant

El aislamiento por tenant se refuerza a nivel de aplicación y base de datos.

Reglas:
- toda entidad de negocio incluye `tenantId`
- todas las consultas de retrieval filtran por `tenantId`
- las API keys resuelven la identidad del tenant
- el acceso cross-tenant está prohibido

---

## Pipeline RAG

### Ingestion De Documentos

1. Subir archivo
2. Extraer texto
3. Sanitizar contenido
4. Dividir en chunks
5. Generar embeddings
6. Almacenar vectores

La implementación actual soporta ingestion para documentos `text/plain` y PDFs con texto seleccionable:

```txt
POST /api/documents/:documentId/ingest
  |
ApiKeyAuthGuard resuelve tenantId
  |
IngestionService carga documento por id + tenantId
  |
ObjectStoragePort lee el objeto almacenado
  |
DocumentTextExtractorService extrae texto
  |
El texto extraído se divide en chunks con solapamiento
  |
Se estima el conteo de tokens por chunk
  |
LocalEmbeddingProvider genera embeddings determinísticos
  |
Se almacenan filas en document_chunks con tenantId + documentId + tokenCount + embedding
  |
El estado del documento pasa a ready
```

El provider de embeddings por defecto es local y determinístico. Se usa para validar el pipeline sin llamar a OpenAI o Gemini. Los embeddings de OpenAI están implementados como provider opcional detrás del mismo contrato de embeddings.

El soporte PDF del MVP no incluye OCR. PDFs escaneados o basados en imágenes deberán procesarse posteriormente mediante un provider OCR dedicado antes del paso de chunking.

La columna de embeddings en base de datos está configurada como `vector(1536)`. Esto alinea el desarrollo local con el modelo de embeddings planificado de OpenAI, `text-embedding-3-small`, cuyo tamaño por defecto es de 1536 dimensiones.

Cambiar las dimensiones de embeddings invalida embeddings generados previamente. Los chunks de desarrollo creados con el provider local anterior de 8 dimensiones se consideraron datos desechables y deben regenerarse, no migrarse semánticamente.

Cambiar de provider de embeddings también requiere reingestar documentos para que los vectores almacenados sean generados de forma consistente por la misma combinación provider/modelo/dimensión.

Antes de que `IngestionService` persista un embedding de chunk, valida dos condiciones:

- que el largo del vector devuelto coincida con la dimensión reportada por el provider
- que la dimensión reportada por el provider coincida con `EMBEDDING_DIMENSIONS`

Esto protege la columna pgvector de recibir vectores incompatibles con la dimensión configurada `vector(1536)`.

El conteo de tokens por chunk se estima durante ingestion con `Math.ceil(content.length / 4)`. Esta heurística simple y adecuada para el MVP permite controlar el presupuesto de contexto antes de que el flujo `/ask` envíe chunks recuperados a un provider LLM.

La selección de contexto está aislada en `ContextSelectionService`. No consulta la base de datos, no resuelve tenants y no reordena resultados de retrieval. Recibe chunks ya filtrados por tenant y seleccionados por retrieval, luego aplica `maxContextTokens` y `candidateLimit` usando `tokenCount` almacenado cuando está disponible.

Implementación actual:

```txt
EmbeddingsModule
  |
EmbeddingsService
  |
token EMBEDDING_PROVIDER
  |
Provider selector lee EMBEDDING_PROVIDER
  |
LocalEmbeddingProvider u OpenAiEmbeddingProvider
  |
Columna embedding pgvector en document_chunks usando vector(1536)
```

El provider de embeddings de OpenAI usa el SDK oficial de OpenAI, `OPENAI_EMBEDDING_MODEL` y `EMBEDDING_DIMENSIONS`. No conoce tenants, documentos ni Prisma. Solo recibe texto y devuelve un resultado de embedding.

Cuando `EMBEDDING_PROVIDER=openai`, ingestion usa OpenAI para generar embeddings de chunks, y retrieval usa OpenAI para generar el embedding de la pregunta. Esto significa que `/ask` consume cuota de la API de embeddings incluso cuando el provider de respuesta sigue siendo local.

### Respuesta A Preguntas

1. Recibir pregunta del usuario
2. Generar embedding
3. Recuperar chunks top-k
4. Construir prompt
5. Llamar al LLM
6. Devolver respuesta + fuentes

Fase actual de retrieval:

```txt
POST /api/retrieval/search
  |
ApiKeyAuthGuard resuelve tenantId
  |
EmbeddingsService genera embedding de la consulta
  |
RetrievalService ejecuta búsqueda SQL con pgvector
  |
WHERE document_chunks.tenantId = tenantId autenticado
  |
Devuelve contenido del chunk + metadata de fuente del documento
```

Retrieval usa distancia coseno de pgvector mediante el operador `<=>` y expone `similarity = 1 - cosine_distance` en las respuestas de API. Valores más altos de similarity representan chunks más relevantes.

Retrieval puede aplicar opcionalmente `MIN_RETRIEVAL_SIMILARITY` para descartar coincidencias débiles antes de devolverlas o enviarlas a `/ask`. Cuando el valor está vacío, retrieval conserva el comportamiento actual y no aplica threshold. Cuando está configurado, los chunks con similarity bajo el threshold son descartados.

Si retrieval no devuelve chunks después del filtrado por threshold, el flujo `/ask` no llama al provider LLM. `ChatService` devuelve una respuesta controlada de contexto insuficiente con fuentes vacías y metadata de uso indicando cero chunks seleccionados.

Fase actual de ask:

```txt
POST /api/ask
  |
ApiKeyAuthGuard resuelve tenantId
  |
ChatService llama a RetrievalService
  |
ContextSelectionService selecciona chunks dentro del presupuesto
  |
Solo los chunks seleccionados se convierten en contexto de respuesta
  |
ChatService llama a LlmService
  |
LLM_PROVIDER resuelve LocalLlmProvider u OpenAiLlmProvider
  |
La respuesta incluye answer + sources + usage shape con métricas de contexto
  |
UsageService persiste una fila en usage_logs
```

La implementación por defecto de ask usa el provider local, lo que mantiene el desarrollo determinístico y evita costos externos de API. OpenAI también está implementado como provider opcional detrás del mismo contrato `LlmProvider`. El acceso al LLM está aislado detrás de `LlmModule`, `LlmService` y el token `LLM_PROVIDER`, por lo que cambiar de provider no requiere modificar el comportamiento del controller ni la lógica de retrieval.

`ChatService` calcula un límite efectivo de candidatos con `Math.min(request.limit ?? MAX_CHUNKS_PER_QUERY, MAX_CHUNKS_PER_QUERY)`. Recupera como máximo esa cantidad de chunks, aplica `ContextSelectionService` y envía solo los chunks seleccionados al provider LLM. Si ningún chunk cabe dentro del presupuesto de contexto, `ChatService` devuelve una respuesta controlada y no llama a `LlmService`.

El provider LLM activo se selecciona desde configuración usando `LLM_PROVIDER_NAME`.

Valores soportados:

```txt
local
openai
```

Valores no soportados fallan al iniciar la aplicación para evitar ejecutar silenciosamente con un provider incorrecto.

Implementación LLM actual:

```txt
LlmModule
  |
LlmService
  |
token LLM_PROVIDER
  |
Provider selector lee LLM_PROVIDER_NAME
  |
LocalLlmProvider u OpenAiLlmProvider
```

El provider local conserva el contrato de respuesta esperado para la API RAG final, incluyendo fuentes y metadata de uso con campos de tokens en `null` hasta integrar un provider LLM real. `ChatService` enriquece el uso del provider con métricas de contexto antes de persistirlo.

El provider OpenAI usa el SDK oficial de OpenAI y la Responses API. Recibe solo los chunks de contexto seleccionados preparados por `ChatService`, construye el input final del modelo a partir del contexto recuperado más la pregunta del usuario y mapea campos de uso del provider al contrato compartido cuando están disponibles.

`OpenAiLlmProvider` realiza una validación defensiva final antes de llamar a la API externa. Rechaza localmente preguntas vacías o contexto vacío, evitando consumir tokens externos de LLM en solicitudes inválidas.

El flujo RAG completo respaldado por OpenAI es:

```txt
POST /api/ask
  |
ApiKeyAuthGuard resuelve tenantId
  |
OpenAiEmbeddingProvider genera embedding de la pregunta
  |
RetrievalService busca chunks pgvector filtrados por tenant
  |
ContextSelectionService limita el contexto seleccionado
  |
OpenAiLlmProvider genera la respuesta
  |
ChatService devuelve answer + sources + usage
  |
UsageService persiste métricas de tokens y contexto
```

Los providers locales siguen disponibles para desarrollo y tests, evitando costos externos de API.

Los adapters externos de LLM deben seguir estas reglas:

- El adapter no debe resolver ni aceptar `tenantId`.
- El adapter no debe consultar Prisma ni recuperar documentos.
- El adapter recibe solo contextos filtrados por tenant y preparados por retrieval.
- El adapter debe construir prompts usando solo contexto recuperado más la pregunta del usuario.
- El adapter no debe loguear prompts completos, API keys ni contenido de documentos.
- El adapter debe devolver un objeto `usage` consistente, usando `null` para tokens o costos no disponibles desde el provider.
- Los tests automatizados deben mockear providers externos y no deben llamar APIs reales de OpenAI o Gemini.

Flujo de providers:

```txt
ChatService
  |
LlmService
  |
LLM_PROVIDER
  |
LocalLlmProvider, OpenAiLlmProvider o futuro GeminiLlmProvider
  |
answer + usage
```

El logging de uso se persiste desde la implementación inicial:

```txt
UsageModule
  |
UsageController expone lecturas acotadas al tenant
  |
UsageService
  |
usage_logs
  |
tenantId + provider + model + campos token/costo + métricas de contexto
```

Cuando el provider LLM local está activo, los campos de tokens se persisten como `null`. Cuando el provider LLM OpenAI está activo, el uso de tokens de OpenAI se mapea a `inputTokens`, `outputTokens` y `totalTokens` cuando el provider lo devuelve. `estimatedCostUsd` sigue siendo nullable y queda reservado para una futura capa de cálculo de precios.

`GET /api/usage` usa `ApiKeyAuthGuard` y lee `tenantId` desde la API key autenticada. Los usage logs no se consultan usando un `tenantId` enviado por el cliente.

La visibilidad de uso utiliza paginación offset con `page` y `limit`. Los filtros de fecha usan `YYYY-MM-DD`; cuando no se entregan fechas, el service usa por defecto el mes calendario actual. Los rangos personalizados están limitados a 90 días. El service aplica filtrado por tenant, filtrado por fecha, ordenamiento `createdAt DESC`, paginación `skip/take` y una consulta `count` acotada al mismo tenant.

---

## Base De Datos

### PostgreSQL + pgvector

Tablas principales:
- tenants
- api_keys
- users
- documents
- document_chunks
- conversations
- messages
- usage_logs

---

## Storage

Los documentos se almacenan usando storage compatible con S3.

Desarrollo:
- MinIO

Producción:
- Cloudflare R2 o AWS S3

El acceso a storage debe estar aislado detrás de providers/adapters para que la lógica de negocio no dependa directamente de MinIO. MinIO es la implementación local compatible con S3, no la abstracción de dominio.

Azure Blob Storage sigue siendo un posible target futuro de producción, pero debe introducirse mediante un adapter separado porque no usa la API S3 de forma nativa.

Implementación actual:

```txt
StorageModule
  |
token provider OBJECT_STORAGE
  |
contrato ObjectStoragePort
  |
S3StorageAdapter
  |
storage compatible con S3 (MinIO localmente)
```

El adapter S3 usa `@aws-sdk/client-s3`. Los services de dominio deben depender del contrato de storage y del token provider, no directamente de MinIO ni de un SDK específico de cloud.

El adapter verifica el bucket configurado antes de subir archivos y lo crea automáticamente cuando no existe.

Las cargas de documentos usan actualmente object keys acotadas por tenant:

```txt
{tenantId}/documents/{timestamp}-{uuid}-{safeFileName}
```

Después de una carga exitosa, la metadata del documento se persiste en PostgreSQL con `storageKey` y `status = uploaded`.

La validación de upload se realiza en el límite del controller antes de llamar al document service. Los MIME types aceptados actualmente son `text/plain` y `application/pdf`, con un tamaño máximo de archivo de 5 MB.

La ingestion de PDF usa un service dedicado de extracción de texto. Soporta PDFs que contienen texto seleccionable y rechaza documentos sin texto extraíble. OCR para PDFs escaneados queda como mejora futura.

---

## Sistema De Queue

BullMQ + Redis se usan para:
- ingestion asíncrona
- generación de embeddings
- futuros jobs en background

---

## Providers De IA

Providers LLM implementados:
- local
- OpenAI

Provider planificado:
- Gemini

La capa de providers debe mantenerse abstraída. Los tests automatizados mockean providers externos y no deben llamar APIs reales de OpenAI o Gemini.

---

## Seguridad

- autenticación con API key
- autenticación JWT para futuros paneles administrativos
- aislamiento por tenant
- validación global de DTOs con NestJS ValidationPipe
- validación de archivos
- logging restringido
- secretos mediante variables de entorno

Reglas de validación:

- los DTOs del request body usan decoradores de validación en runtime
- propiedades desconocidas del body son rechazadas
- los endpoints de negocio no deben confiar en `tenantId` desde request bodies
- la identidad del tenant se resuelve desde API keys
- los paneles administrativos deben resolver usuario, rol y tenant desde JWT
- la seguridad debe aplicarse en backend; ocultar rutas en frontend solo mejora la UX, no reemplaza autorización

---

## Despliegue

Desarrollo local:
- Docker Compose

Despliegue cloud validado para el MVP:
- Railway para API y PostgreSQL
- Cloudflare R2 para storage
- Cloudflare Workers para client demo

---

## Mejoras Futuras

- RBAC
- agents
- automatización de workflows
- billing por uso
- automatización Terraform ampliada
- conectores ERP
