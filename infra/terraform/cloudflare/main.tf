terraform {
  required_version = ">= 1.14.0"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.19"
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

resource "cloudflare_r2_bucket" "documents" {
  account_id    = var.cloudflare_account_id
  name          = var.r2_bucket_name
  jurisdiction  = "default"
  storage_class = "Standard"
}