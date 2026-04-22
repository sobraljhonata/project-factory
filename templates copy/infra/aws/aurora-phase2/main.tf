data "aws_rds_engine_version" "aurora_mysql" {
  engine  = "aurora-mysql"
  version = "8.0"
}

locals {
  name = "${var.project_name}-${var.environment}-aurora"
}

resource "random_password" "master" {
  length           = 32
  special          = true
  override_special = "!#$%^&*()-_=+[]?"
}

resource "aws_db_subnet_group" "aurora" {
  name       = "${local.name}-subnets"
  subnet_ids = var.database_subnet_ids

  tags = {
    Name        = "${local.name}-subnets"
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_security_group" "aurora" {
  name        = "${local.name}-sg"
  description = "Aurora MySQL (Fase 2, sem RDS Proxy)"
  vpc_id      = var.vpc_id

  dynamic "ingress" {
    for_each = var.allowed_cidr_blocks
    content {
      description = "MySQL de CIDR autorizado (lab / escritório)"
      from_port   = 3306
      to_port     = 3306
      protocol    = "tcp"
      cidr_blocks = [ingress.value]
    }
  }

  dynamic "ingress" {
    for_each = var.allowed_security_group_ids
    content {
      description     = "MySQL de SG interno (ex.: ECS)"
      from_port       = 3306
      to_port         = 3306
      protocol        = "tcp"
      security_groups = [ingress.value]
    }
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "${local.name}-sg"
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_rds_cluster" "this" {
  cluster_identifier = local.name

  engine         = "aurora-mysql"
  engine_version = data.aws_rds_engine_version.aurora_mysql.version

  database_name   = var.db_name
  master_username = var.master_username
  master_password = random_password.master.result

  db_subnet_group_name            = aws_db_subnet_group.aurora.name
  vpc_security_group_ids          = [aws_security_group.aurora.id]
  storage_encrypted               = true
  backup_retention_period         = var.backup_retention_days
  preferred_backup_window         = "05:00-06:00"
  enabled_cloudwatch_logs_exports = ["error"]
  skip_final_snapshot             = var.skip_final_snapshot
  deletion_protection             = false
  apply_immediately               = true

  tags = {
    Name        = local.name
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_rds_cluster_instance" "writer" {
  identifier                   = "${local.name}-writer-1"
  cluster_identifier           = aws_rds_cluster.this.id
  instance_class               = var.instance_class
  engine                       = aws_rds_cluster.this.engine
  engine_version               = aws_rds_cluster.this.engine_version
  publicly_accessible          = var.publicly_accessible
  performance_insights_enabled = false

  tags = {
    Name        = "${local.name}-writer"
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret" "aurora" {
  name                    = "${local.name}/credentials"
  recovery_window_in_days = 0

  tags = {
    Name        = "${local.name}-secret"
    Project     = var.project_name
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "aurora" {
  secret_id = aws_secretsmanager_secret.aurora.id
  secret_string = jsonencode({
    host     = aws_rds_cluster.this.endpoint
    port     = 3306
    username = var.master_username
    password = random_password.master.result
    database = var.db_name
    engine   = "aurora-mysql"
  })
}
