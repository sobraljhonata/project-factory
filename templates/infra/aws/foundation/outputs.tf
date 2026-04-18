output "alb_dns_name" {
  description = "Nome DNS do ALB (use alb_public_base_url para o esquema correto)"
  value       = aws_lb.main.dns_name
}

output "alb_public_base_url" {
  description = "Base URL do ALB (https se acm_certificate_arn definido, senão http). Preferir api_gateway_https_base_url quando API Gateway estiver habilitado."
  value       = var.acm_certificate_arn != "" ? "https://${aws_lb.main.dns_name}" : "http://${aws_lb.main.dns_name}"
}

output "api_gateway_https_base_url" {
  description = "HTTPS no domínio execute-api (sem domínio próprio). Null se enable_apigatewayv2_alb_proxy=false."
  value       = var.enable_apigatewayv2_alb_proxy ? trimsuffix(aws_apigatewayv2_stage.apigw_default[0].invoke_url, "/") : null
}

output "api_gateway_execution_arn" {
  description = "ARN da API HTTP (útil para políticas IAM)."
  value       = var.enable_apigatewayv2_alb_proxy ? aws_apigatewayv2_api.public_https[0].arn : null
}

output "ecr_repository_url" {
  description = "docker build ... && docker tag ... && docker push ..."
  value       = aws_ecr_repository.api.repository_url
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  value = aws_ecs_service.app.name
}

output "rds_endpoint" {
  description = "Host MySQL gerenciado (null se use_managed_rds=false)"
  value       = var.use_managed_rds ? aws_db_instance.mysql[0].address : null
}

output "ecs_tasks_security_group_id" {
  description = "Anexe no Aurora (allowed_security_group_ids) quando use_managed_rds=false"
  value       = aws_security_group.ecs_tasks.id
}

output "app_secrets_arn" {
  description = "Secrets Manager — JWT + DB_PASSWORD"
  value       = aws_secretsmanager_secret.app.arn
  sensitive   = true
}

output "vpc_id" {
  value = aws_vpc.main.id
}

output "private_subnet_ids" {
  description = "IDs das subnets privadas (2 AZs). Use no Aurora/RDS em produção ou com bastion/VPN."
  value       = aws_subnet.private[*].id
}

output "public_subnet_ids" {
  description = "IDs das subnets públicas (2 AZs). Só para laboratório com publicly_accessible=true no Aurora."
  value       = aws_subnet.public[*].id
}

output "nat_gateway_public_ip" {
  description = "IP elástico do NAT quando nat_gateway_enabled=true (egress das tasks)"
  value       = var.nat_gateway_enabled ? aws_eip.nat[0].public_ip : null
}
