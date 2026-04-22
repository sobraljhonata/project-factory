output "cluster_endpoint" {
  description = "Host writer (DB_HOST na API / Sequelize)"
  value       = aws_rds_cluster.this.endpoint
}

output "cluster_reader_endpoint" {
  description = "Reader (não usado nesta fase sem réplicas dedicadas)"
  value       = aws_rds_cluster.this.reader_endpoint
}

output "cluster_port" {
  value = aws_rds_cluster.this.port
}

output "database_name" {
  value = var.db_name
}

output "master_username" {
  value = var.master_username
}

output "secrets_manager_arn" {
  description = "Credenciais em JSON (host, port, username, password, database)"
  value       = aws_secretsmanager_secret.aurora.arn
  sensitive   = true
}

output "security_group_id" {
  value = aws_security_group.aurora.id
}
