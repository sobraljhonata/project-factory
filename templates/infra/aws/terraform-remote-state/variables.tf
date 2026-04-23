variable "aws_region" {
  type        = string
  description = "Região AWS do bucket S3 e da tabela DynamoDB"
  default     = "{{AWS_REGION}}"
}

variable "name_prefix" {
  type        = string
  description = "Prefixo para bucket e tabela (kebab-case; sufixo aleatório evita colisão global no S3)"
  default     = "{{PROJECT_SLUG}}"
}
