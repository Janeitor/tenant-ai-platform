# Terraform Cloudflare

Este módulo de Terraform administra infraestructura de Cloudflare usada por el MVP de Tenant AI.

Alcance actual:

- Bucket de Cloudflare R2 para almacenamiento de documentos por tenant.

## Requisitos

- Terraform
- Cloudflare account ID
- Cloudflare API token con permisos para administrar buckets R2

## Variables

Crear un archivo local `terraform.tfvars`:

```hcl
cloudflare_account_id = "your-cloudflare-account-id"
r2_bucket_name        = "tenant-ai-documents"
```

`terraform.tfvars` no debe ser committeado porque puede contener valores sensibles o específicos del entorno.

## Estado Actual

El bucket existente `tenant-ai-documents` fue importado al estado local de Terraform y validado con:

```bash
terraform plan
```

Resultado esperado:

```txt
No changes. Your infrastructure matches the configuration.
```

## Archivos Ignorados

Los siguientes archivos o carpetas se mantienen fuera de Git:

```txt
.terraform/
terraform.tfstate
terraform.tfvars
```

Terraform administra recursos de infraestructura. Las migraciones de Prisma y los datos de aplicación se administran por separado.
