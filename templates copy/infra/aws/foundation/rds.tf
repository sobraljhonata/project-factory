resource "random_password" "db_master" {
  count = var.use_managed_rds ? 1 : 0

  length           = 24
  special          = true
  override_special = "!#$%^&*()-_=+[]?"
}

resource "aws_security_group" "rds" {
  count = var.use_managed_rds ? 1 : 0

  name        = "${local.name}-rds"
  description = "MySQL RDS (gerenciado pelo foundation)"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "MySQL das tasks ECS"
    from_port       = 3306
    to_port         = 3306
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs_tasks.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, { Name = "${local.name}-rds-sg" })
}

resource "aws_db_subnet_group" "main" {
  count = var.use_managed_rds ? 1 : 0

  name       = "${local.name}-db-subnets"
  subnet_ids = aws_subnet.private[*].id

  tags = merge(local.common_tags, { Name = "${local.name}-db-subnet-group" })
}

resource "aws_db_instance" "mysql" {
  count = var.use_managed_rds ? 1 : 0

  identifier                 = "${local.name}-mysql"
  engine                     = "mysql"
  engine_version             = "8.0"
  instance_class             = var.db_instance_class
  allocated_storage          = 20
  max_allocated_storage      = 50
  storage_type               = "gp3"
  db_name                    = var.db_name
  username                   = var.db_username
  password                   = random_password.db_master[0].result
  db_subnet_group_name       = aws_db_subnet_group.main[0].name
  vpc_security_group_ids     = [aws_security_group.rds[0].id]
  publicly_accessible        = false
  skip_final_snapshot        = var.rds_skip_final_snapshot
  final_snapshot_identifier  = var.rds_skip_final_snapshot ? null : (var.rds_final_snapshot_identifier != "" ? var.rds_final_snapshot_identifier : "${replace(local.name, "_", "-")}-final")
  backup_retention_period    = var.rds_backup_retention_period
  deletion_protection        = var.rds_deletion_protection
  multi_az                   = var.rds_multi_az
  auto_minor_version_upgrade = true

  tags = merge(local.common_tags, { Name = "${local.name}-mysql" })
}
