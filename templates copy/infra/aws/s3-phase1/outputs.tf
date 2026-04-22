output "bucket_name" {
  description = "Nome do bucket (S3_BUCKET)"
  value       = aws_s3_bucket.media.id
}

output "bucket_arn" {
  description = "ARN do bucket"
  value       = aws_s3_bucket.media.arn
}

output "s3_public_base_url" {
  description = "Base URL sugerida para S3_PUBLIC_BASE_URL (sem barra final)"
  value       = "https://${aws_s3_bucket.media.bucket_regional_domain_name}"
}

output "iam_policy_arn" {
  description = "Anexe à task role (ECS) ou ao usuário dev (já anexado se developer_iam_user_name foi informado)"
  value       = aws_iam_policy.app_media.arn
}

output "public_prefix" {
  description = "Prefixo público (S3_PUBLIC_PREFIX)"
  value       = var.s3_public_prefix
}
