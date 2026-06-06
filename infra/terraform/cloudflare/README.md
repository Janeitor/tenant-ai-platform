# Cloudflare Terraform

This Terraform module manages Cloudflare infrastructure used by the Tenant AI MVP.

Current scope:

- Cloudflare R2 bucket for tenant document storage

## Requirements

- Terraform
- Cloudflare account ID
- Cloudflare API token with R2 bucket management permissions

## Variables

Create a local `terraform.tfvars` file:

```hcl
cloudflare_account_id = "your-cloudflare-account-id"
r2_bucket_name        = "tenant-ai-documents"