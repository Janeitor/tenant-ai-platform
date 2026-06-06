output "r2_bucket_name" {
  description = "Managed R2 bucket name."
  value       = cloudflare_r2_bucket.documents.name
}