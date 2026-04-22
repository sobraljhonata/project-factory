locals {
  name = "${var.project_name}-${var.environment}"

  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }

  effective_db_host = length(aws_db_instance.mysql) > 0 ? aws_db_instance.mysql[0].address : var.external_db_host

  effective_db_password = length(random_password.db_master) > 0 ? random_password.db_master[0].result : var.external_db_password

  ecs_subnet_ids = var.nat_gateway_enabled ? aws_subnet.private[*].id : aws_subnet.public[*].id

  alb_cloudwatch_dimension = regex("loadbalancer/(.+)$", aws_lb.main.arn)[0]
  tg_cloudwatch_dimension  = regex("targetgroup/(.+)$", aws_lb_target_group.app.arn)[0]

  # Com API Gateway na frente, o listener HTTP:80 deve encaminhar ao TG (API GW chama o ALB por HTTP).
  # Se ACM estiver definido e não houver API GW, o :80 redireciona para :443.
  alb_http_redirect_to_https = var.acm_certificate_arn != "" && !var.enable_apigatewayv2_alb_proxy
}

data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  azs = slice(data.aws_availability_zones.available.names, 0, 2)
}
