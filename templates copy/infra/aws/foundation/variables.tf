variable "aws_region" {
  type        = string
  description = "Região (deve ser a mesma do bucket S3 da Fase 1)"
  default     = "us-east-1"
}

variable "project_name" {
  type        = string
  description = "Prefixo de nomes de recursos"
  default     = "{{PROJECT_SLUG}}"
}

variable "environment" {
  type        = string
  description = "Nome lógico do ambiente (ex.: dev, staging)"
  default     = "dev"
}

# --- Rede (laboratório: sem NAT; Fargate em subnet pública) ---
variable "vpc_cidr" {
  type    = string
  default = "10.42.0.0/16"
}

# --- Banco: RDS gerenciado (foundation) OU externo (ex.: Aurora Fase 2) ---
variable "use_managed_rds" {
  type        = bool
  default     = true
  description = "false = usar Aurora/outro MySQL (external_db_*); não cria RDS neste VPC"
}

variable "external_db_host" {
  type        = string
  default     = ""
  description = "Obrigatório se use_managed_rds=false (ex.: output cluster_endpoint do aurora-phase2)"
}

variable "external_db_password" {
  type        = string
  sensitive   = true
  default     = ""
  description = "Senha MySQL no banco externo (ex.: mesma do secret do Aurora)"
}

# --- RDS (somente use_managed_rds = true) ---
variable "db_name" {
  type    = string
  default = "db_app"
}

variable "db_username" {
  type    = string
  default = "app_user"
}

variable "db_instance_class" {
  type    = string
  default = "db.t4g.micro"
}

# --- S3 (saída do módulo s3-phase1) ---
variable "media_bucket_name" {
  type        = string
  description = "Nome do bucket criado em infra/aws/s3-phase1 (terraform output bucket_name)"
}

variable "s3_public_base_url" {
  type        = string
  description = "Sem barra final — mesmo valor de terraform output s3_public_base_url (s3-phase1)"
}

variable "s3_public_prefix" {
  type    = string
  default = "public"
}

variable "health_check_path" {
  type        = string
  description = "API publicada: /health ; smoke nginx: /"
  default     = "/"
}

# --- Container (até você publicar a imagem Node no ECR) ---
variable "container_image" {
  type        = string
  description = "URI ECR (terraform output ecr_repository_url) + tag"
  default     = "public.ecr.aws/docker/library/nginx:alpine"
}

variable "container_port" {
  type        = number
  default     = 80
  description = "API Node no ECS: 3000 ; imagem nginx padrão: 80"
}

variable "desired_count" {
  type    = number
  default = 1
}

variable "jwt_secret" {
  type        = string
  sensitive   = true
  description = "≥16 caracteres (env.ts). Em laboratório pode ser temporário."
}

variable "jwt_access_secret" {
  type        = string
  sensitive   = true
  description = "≥16 caracteres"
}

variable "jwt_refresh_secret" {
  type        = string
  sensitive   = true
  description = "≥16 caracteres"
}

variable "bootstrap_admin_email" {
  type        = string
  default     = "admin@example.com"
  description = "E-mail do admin criado pelo seed; repassado como ADMIN_EMAIL na task ECS (env.ts exige em produção)."
}

variable "bootstrap_admin_password" {
  type        = string
  sensitive   = true
  default     = "admin123"
  description = "Senha inicial do admin (Secrets Manager → ADMIN_PASSWORD). O login HTTP valida 6–8 caracteres — ajuste o schema ou a senha se precisar de mais."
}

# --- Produção / endurecimento (valores padrão preservam laboratório) ---

variable "nat_gateway_enabled" {
  type        = bool
  default     = false
  description = "true = Fargate em subnets privadas com egress via NAT (1 AZ); false = tasks em subnet pública com IP público (lab)"
}

variable "acm_certificate_arn" {
  type        = string
  default     = ""
  description = "Obrigatório para HTTPS no ALB (porta 443). ARN do certificado ACM na MESMA região do ALB; validação DNS (recomendado) ou email. Vazio = só HTTP na 80 (https:// no DNS do ALB não conecta). Com ARN: listener 443 + redirect 301 80→443 + ingress 443 no SG + FORCE_HTTPS_REDIRECT na task."
}

variable "enable_apigatewayv2_alb_proxy" {
  type        = bool
  default     = false
  description = "API Gateway HTTP API (HTTPS em *.execute-api.*) na frente do ALB — sem domínio próprio. Com true e ACM, o listener :80 encaminha ao TG (API GW usa HTTP interno até o ALB)."
}

variable "api_gateway_cors_allow_origins" {
  type        = list(string)
  default     = ["*"]
  description = "CORS no API Gateway (preflight). Restrinja em produção."
}

variable "rds_backup_retention_period" {
  type        = number
  default     = 1
  description = "Dias de backup automático (produção: 7–35)"
}

variable "rds_skip_final_snapshot" {
  type        = bool
  default     = true
  description = "false em produção para snapshot final ao destruir (defina rds_final_snapshot_identifier se quiser nome fixo)"
}

variable "rds_final_snapshot_identifier" {
  type        = string
  default     = ""
  description = "Nome do snapshot final se rds_skip_final_snapshot=false; vazio = \"<project-env>-final\""
}

variable "rds_deletion_protection" {
  type        = bool
  default     = false
  description = "true em produção contra drop acidental"
}

variable "rds_multi_az" {
  type        = bool
  default     = false
  description = "true para RDS Multi-AZ (disponibilidade; custo maior)"
}

variable "secret_recovery_window_in_days" {
  type        = number
  default     = 0
  description = "Janela de recuperação do Secrets Manager (0 = imediato, lab; produção: 7–30)"

  validation {
    condition     = var.secret_recovery_window_in_days >= 0 && var.secret_recovery_window_in_days <= 30
    error_message = "secret_recovery_window_in_days deve estar entre 0 e 30."
  }
}

variable "ecs_log_retention_in_days" {
  type        = number
  default     = 7
  description = "Retenção CloudWatch Logs das tasks (produção: 30–90)"
}

variable "ecs_container_insights" {
  type        = string
  default     = "disabled"
  description = "enabled | disabled — métricas ECS no CloudWatch"

  validation {
    condition     = contains(["enabled", "disabled"], var.ecs_container_insights)
    error_message = "ecs_container_insights deve ser \"enabled\" ou \"disabled\"."
  }
}

variable "enable_ecs_autoscaling" {
  type        = bool
  default     = false
  description = "Target tracking CPU 70% entre min e max"
}

variable "ecs_autoscaling_min_capacity" {
  type    = number
  default = 1
}

variable "ecs_autoscaling_max_capacity" {
  type    = number
  default = 4
}

variable "enable_cloudwatch_alarms" {
  type        = bool
  default     = false
  description = "Alarmes ALB/TG (5xx e unhealthy); opcional SNS"
}

variable "alarm_sns_topic_arn" {
  type        = string
  default     = ""
  description = "ARN SNS para notificações dos alarmes (vazio = só console)"
}

variable "enable_waf" {
  type        = bool
  default     = false
  description = "WAFv2 regional associado ao ALB (AWSManagedRulesCommonRuleSet)"
}
