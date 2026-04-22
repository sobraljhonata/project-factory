resource "aws_ecr_repository" "api" {
  name                 = "${local.name}-api"
  image_tag_mutability = "MUTABLE"
  force_delete         = true # permite terraform destroy mesmo com imagens (reset de lab)

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = merge(local.common_tags, { Name = "${local.name}-ecr" })
}
