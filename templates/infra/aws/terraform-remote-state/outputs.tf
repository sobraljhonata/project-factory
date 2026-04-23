output "terraform_state_bucket_id" {
  description = "Nome do bucket S3 para armazenar o state"
  value       = aws_s3_bucket.terraform_state.id
}

output "terraform_state_bucket_arn" {
  description = "ARN do bucket de state"
  value       = aws_s3_bucket.terraform_state.arn
}

output "terraform_state_lock_table_name" {
  description = "Nome da tabela DynamoDB para lock (use em backend \"s3\" como dynamodb_table)"
  value       = aws_dynamodb_table.terraform_lock.name
}
