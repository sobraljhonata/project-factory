resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/${local.name}"
  retention_in_days = var.ecs_log_retention_in_days

  tags = local.common_tags
}

resource "aws_ecs_cluster" "main" {
  name = "${local.name}-cluster"

  setting {
    name  = "containerInsights"
    value = var.ecs_container_insights
  }

  tags = local.common_tags
}

locals {
  secret_arn = aws_secretsmanager_secret.app.arn

  container_secrets = [
    { name = "JWT_SECRET", valueFrom = "${local.secret_arn}:JWT_SECRET::" },
    { name = "JWT_ACCESS_SECRET", valueFrom = "${local.secret_arn}:JWT_ACCESS_SECRET::" },
    { name = "JWT_REFRESH_SECRET", valueFrom = "${local.secret_arn}:JWT_REFRESH_SECRET::" },
    { name = "DB_PASSWORD", valueFrom = "${local.secret_arn}:DB_PASSWORD::" },
    { name = "ADMIN_PASSWORD", valueFrom = "${local.secret_arn}:ADMIN_PASSWORD::" },
  ]

  container_environment = [
    { name = "NODE_ENV", value = "production" },
    { name = "PORT", value = tostring(var.container_port) },
    { name = "DB_HOST", value = local.effective_db_host },
    { name = "DB_PORT", value = "3306" },
    { name = "DB_DATABASE", value = var.db_name },
    { name = "DB_USERNAME", value = var.db_username },
    { name = "DB_DIALECT", value = "mysql" },
    { name = "DB_SSL", value = "true" },
    { name = "DB_SSL_REJECT_UNAUTHORIZED", value = "true" },
    { name = "MEDIA_STORAGE", value = "s3" },
    { name = "S3_BUCKET", value = var.media_bucket_name },
    { name = "S3_PUBLIC_BASE_URL", value = var.s3_public_base_url },
    { name = "S3_PUBLIC_PREFIX", value = var.s3_public_prefix },
    { name = "AWS_REGION", value = var.aws_region },
    { name = "AWS_DEFAULT_REGION", value = var.aws_region },
    { name = "SWAGGER_ENABLED", value = "false" },
    { name = "UPDATE_MODEL", value = "false" },
    { name = "READINESS_CHECK_DB", value = "true" },
    { name = "ADMIN_EMAIL", value = var.bootstrap_admin_email },
    {
      name  = "FORCE_HTTPS_REDIRECT"
      value = var.acm_certificate_arn != "" ? "true" : "false"
    },
  ]
}

resource "aws_ecs_task_definition" "app" {
  family                   = "${local.name}-app"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = "512"
  memory                   = "1024"
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  lifecycle {
    precondition {
      condition = var.use_managed_rds || (
        var.external_db_host != "" && var.external_db_password != ""
      )
      error_message = "Com use_managed_rds=false, defina external_db_host e external_db_password (ex.: Aurora)."
    }
  }

  container_definitions = jsonencode([
    {
      name         = "app"
      image        = var.container_image
      essential    = true
      portMappings = [{ containerPort = var.container_port, protocol = "tcp" }]
      secrets      = local.container_secrets
      environment  = local.container_environment
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.ecs.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "app"
        }
      }
    }
  ])

  tags = local.common_tags
}

resource "aws_ecs_service" "app" {
  name                              = "${local.name}-svc"
  cluster                           = aws_ecs_cluster.main.id
  task_definition                   = aws_ecs_task_definition.app.arn
  desired_count                     = var.desired_count
  launch_type                       = "FARGATE"
  health_check_grace_period_seconds = 120

  network_configuration {
    subnets          = local.ecs_subnet_ids
    security_groups  = [aws_security_group.ecs_tasks.id]
    assign_public_ip = !var.nat_gateway_enabled
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "app"
    container_port   = var.container_port
  }

  depends_on = [aws_lb_listener.http, aws_lb_target_group.app]

  tags = local.common_tags
}
