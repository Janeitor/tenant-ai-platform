# AGENTS.md

## Contexto Del Proyecto

Este proyecto es una plataforma de IA empresarial multi-tenant que expone una API RAG para que las empresas puedan consultar sus documentos internos sin administrar infraestructura de IA.

El producto debe priorizar:
- diseño API-first
- aislamiento multi-tenant
- arquitectura limpia
- procesamiento seguro de documentos
- retrieval con filtrado por tenant
- respuestas con fuentes
- visibilidad del uso de tokens
- código testeable y mantenible

El entregable inicial no es un prototipo desechable. Todas las funcionalidades implementadas deben seguir los mismos estándares de arquitectura, seguridad y mantenibilidad esperados para el producto final.

---

## Modo De Colaboración Y Aprendizaje

El desarrollador está aprendiendo el stack mientras construye el proyecto.

Antes de implementar una nueva funcionalidad o módulo:
- Explicar primero el modelo mental y el flujo de la solicitud.
- Describir qué archivos se crearán o modificarán y por qué.
- Implementar el cambio paso a paso.
- Después de la implementación, entregar una breve recapitulación explicando cómo interactúan las nuevas piezas.
- Incentivar preguntas antes de pasar a la siguiente funcionalidad.

Evitar el "vibecoding" sin explicación. El proyecto debe avanzar de una forma que permita al desarrollador entender, mantener y explicar el código.

---

## Tech Stack

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

---

## Reglas De Arquitectura

Usar arquitectura modular en NestJS.

Módulos preferidos:
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

El módulo `usage` debe registrar y exponer el consumo de tokens para visibilidad del producto.

No mezclar lógica de negocio dentro de controllers.

Los controllers solo deben:
- validar la solicitud
- llamar a servicios de aplicación
- devolver DTOs

La lógica de negocio debe vivir en services o use cases.

La lógica específica de infraestructura debe aislarse en providers o adapters.

---

## Reglas Multi-Tenant

El aislamiento por tenant es obligatorio.

Cada documento, chunk, conversación, API key y registro de uso debe incluir `tenantId`.

Toda consulta de base de datos que involucre datos de negocio debe filtrar por `tenantId`.

Nunca permitir acceso cross-tenant.

Nunca confiar en `tenantId` recibido desde el body si una API key o JWT ya resolvió el tenant.

---

## Reglas RAG

El flujo de `/ask` debe ser:

1. Resolver el tenant desde la API key.
2. Crear el embedding de la pregunta del usuario.
3. Buscar chunks relevantes filtrados por `tenantId`.
4. Construir un prompt usando solo el contexto recuperado.
5. Llamar al LLM.
6. Devolver respuesta, fuentes y metadata de uso.

Las respuestas deben incluir fuentes cuando estén disponibles.

Si no se encuentra contexto relevante, el asistente debe indicar que los documentos disponibles no contienen información suficiente.

---

## Reglas De Uso Y Tracking De Tokens

El producto debe incluir visibilidad básica del uso de tokens desde el entregable inicial.

Para cada solicitud a `/ask`, almacenar y devolver metadata de uso cuando esté disponible:
- input tokens
- output tokens
- total tokens
- modelo utilizado
- provider utilizado
- costo estimado cuando exista configuración de precios
- tenantId
- timestamp de la solicitud

La respuesta de `/ask` debe incluir un objeto `usage`.

Ejemplo de shape de respuesta:

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

El uso de tokens debe persistirse en `usage_logs`.

La visibilidad de uso debe soportar:
- uso por request
- uso por tenant
- futuros límites mensuales

No bloquear el entregable inicial si un provider no devuelve datos exactos de uso. En ese caso, almacenar `null` para los valores no disponibles y mantener consistente el shape de respuesta.

---

## Reglas De Testing

Agregar o actualizar tests para cada cambio relevante.

Usar:
- unit tests para services
- integration tests para endpoints de API
- providers LLM mockeados en tests
- providers de embeddings mockeados cuando corresponda

Tests importantes:
- aislamiento por tenant
- autenticación con API key
- carga de documentos
- creación de chunks
- búsqueda vectorial filtrada por tenant
- shape de respuesta de `/ask`
- logging de uso
- uso de tokens devuelto por `/ask`

No llamar APIs reales de OpenAI/Gemini en tests automatizados.

---

## Estilo De Código

Usar TypeScript strict mode.

Preferir:
- DTOs explícitos
- dependency injection
- services pequeños
- límites claros entre módulos
- nombres descriptivos
- async/await
- variables de entorno vía config service

Evitar:
- secretos hardcodeados
- lógica de negocio en controllers
- llamadas directas a SDKs de providers fuera de adapters de infraestructura
- `any` sin tipar
- estado mutable global

---

## Reglas De Seguridad

Nunca committear secretos.

Usar `.env.example` para variables de entorno requeridas.

Validar archivos subidos:
- MIME types permitidos
- tamaño máximo de archivo
- propiedad del tenant

No registrar en logs API keys, prompts con datos sensibles ni contenido completo de documentos.

---

## Análisis De Vulnerabilidades

El producto debe incluir análisis básico de vulnerabilidades como parte del desarrollo y CI desde el entregable inicial.

Usar checks automatizados para:
- vulnerabilidades de dependencias con `npm audit` o herramienta equivalente
- detección de secretos antes de commits y en CI
- análisis estático y reglas de lint enfocadas en seguridad cuando sea práctico
- escaneo de vulnerabilidades de imagen Docker cuando se introduzcan imágenes de contenedor
- revisión de seguridad de API basada en OWASP API Security Top 10

Los flujos sensibles de seguridad deben incluir tests para:
- aislamiento por tenant
- fallos de autenticación y autorización con API key
- intentos no autorizados de acceso cross-tenant
- validación de carga de archivos
- prevención de filtración de prompts, fuentes y datos de documentos

Los hallazgos de vulnerabilidades deben documentarse con:
- severidad
- componente afectado
- reproducción o evidencia
- corrección recomendada
- estado

No bloquear el entregable inicial por tooling avanzado de seguridad empresarial, pero mantener el proyecto preparado para agregar checks más fuertes en CI/CD.

---

## Reglas De Base De Datos

Usar migraciones de Prisma.

Usar PostgreSQL con pgvector para embeddings.

Preferir diseños de schema que refuercen propiedad por tenant.

Las consultas de búsqueda vectorial deben incluir filtrado por tenant.

---

## Reglas De Git

Antes de finalizar una tarea, ejecutar:

```bash
npm run lint
npm run test
npm run build
```

Si un comando falla, explicar la falla y proponer la corrección más pequeña.

---

## Reglas De Documentación

Actualizar `README.md` cuando:
- cambie el setup
- cambien variables de entorno
- cambien endpoints de API
- cambien instrucciones de despliegue

Mantener la documentación útil para el evaluador del TFM.

---

## Alcance Del Entregable Inicial

Implementar:
- creación de tenants
- autenticación con API key
- carga de documentos
- ingestion
- embeddings
- retrieval vectorial
- endpoint ask
- fuentes
- usage logs
- visibilidad de uso de tokens
- tests
- Docker Compose

No implementar todavía:
- agents
- fine-tuning
- workflows complejos
- conectores ERP
- RBAC avanzado
- integración de billing
- automatización Terraform de producción
