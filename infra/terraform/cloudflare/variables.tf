variable "cloudflare_api_token" {
  description = "Cloudflare API token with permission to manage R2 buckets."
  type        = string
  sensitive   = true
}

variable "cloudflare_account_id" {
  description = "Cloudflare account ID."
  type        = string
}

variable "r2_bucket_name" {
  description = "R2 bucket used by the Tenant AI API for document storage."
  type        = string
  default     = "tenant-ai-documents"
}