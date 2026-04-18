resource "aws_secretsmanager_secret" "app" {
  name                    = "${local.name}/app/runtime"
  recovery_window_in_days = var.secret_recovery_window_in_days

  tags = merge(local.common_tags, { Name = "${local.name}-app-secret" })
}

resource "aws_secretsmanager_secret_version" "app" {
  secret_id = aws_secretsmanager_secret.app.id
  secret_string = jsonencode({
    JWT_SECRET         = var.jwt_secret
    JWT_ACCESS_SECRET  = var.jwt_access_secret
    JWT_REFRESH_SECRET = var.jwt_refresh_secret
    DB_PASSWORD        = local.effective_db_password
    ADMIN_PASSWORD     = var.bootstrap_admin_password
  })
}
