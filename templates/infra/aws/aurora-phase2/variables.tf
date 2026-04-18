variable "aws_region" {
  type    = string
  default = "us-east-1"
}

variable "project_name" {
  type    = string
  default = "{{PROJECT_SLUG}}"
}

variable "environment" {
  type    = string
  default = "dev"
}

variable "vpc_id" {
  type        = string
  description = "VPC existente (ex.: output vpc_id do stack foundation)"
}

variable "database_subnet_ids" {
  type        = list(string)
  description = "≥2 subnets em AZs distintas. Laboratório com acesso da internet: use subnets públicas do foundation + publicly_accessible=true."
}

variable "allowed_cidr_blocks" {
  type        = list(string)
  description = "CIDRs que podem conectar na 3306 (ex.: seu IP público /32). Produção: prefira SG de app ou bastion, não 0.0.0.0/0."
  default     = []
}

variable "allowed_security_group_ids" {
  type        = list(string)
  description = "Ex.: security group das tasks ECS no mesmo VPC"
  default     = []
}

variable "db_name" {
  type    = string
  default = "db_app"
}

variable "master_username" {
  type    = string
  default = "app_admin"
}

variable "instance_class" {
  type        = string
  description = "Classe mínima varia por região; db.t3.medium costuma ser a menor para Aurora MySQL provisionado"
  default     = "db.t3.medium"
}

variable "publicly_accessible" {
  type        = bool
  description = "true só em laboratório com subnets roteáveis à internet e SG restrito"
  default     = false
}

variable "backup_retention_days" {
  type    = number
  default = 1
}

variable "skip_final_snapshot" {
  type    = bool
  default = true
}
