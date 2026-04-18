resource "random_id" "bucket_suffix" {
  byte_length = 4
}

locals {
  bucket_name = lower("${var.project_name}-media-${random_id.bucket_suffix.hex}")
}

resource "aws_s3_bucket" "media" {
  bucket = local.bucket_name
}

resource "aws_s3_bucket_versioning" "media" {
  bucket = aws_s3_bucket.media.id
  versioning_configuration {
    status = var.enable_versioning ? "Enabled" : "Suspended"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "media" {
  bucket = aws_s3_bucket.media.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Leitura anônima apenas sob o prefixo público (alinhado ao contrato da API).
resource "aws_s3_bucket_public_access_block" "media" {
  bucket = aws_s3_bucket.media.id

  block_public_acls       = true
  block_public_policy     = false
  ignore_public_acls      = true
  restrict_public_buckets = false
}

data "aws_iam_policy_document" "public_read_prefix" {
  statement {
    sid    = "PublicReadGetObjectUnderPrefix"
    effect = "Allow"

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.media.arn}/${var.s3_public_prefix}/*"]
  }
}

resource "aws_s3_bucket_policy" "public_read" {
  bucket = aws_s3_bucket.media.id
  policy = data.aws_iam_policy_document.public_read_prefix.json

  depends_on = [aws_s3_bucket_public_access_block.media]
}

resource "aws_s3_bucket_cors_configuration" "media" {
  bucket = aws_s3_bucket.media.id

  cors_rule {
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["*"]
    allowed_headers = ["*"]
    max_age_seconds = 3600
  }
}

# Permissões mínimas da aplicação (Put/Get/Delete/Head no prefixo; List com condição).
data "aws_iam_policy_document" "app_media" {
  statement {
    sid    = "AppObjectReadWriteDelete"
    effect = "Allow"

    actions = [
      "s3:PutObject",
      "s3:GetObject",
      "s3:DeleteObject",
    ]

    resources = ["${aws_s3_bucket.media.arn}/${var.s3_public_prefix}/*"]
  }

  statement {
    sid    = "AppListBucketUnderPrefix"
    effect = "Allow"

    actions   = ["s3:ListBucket"]
    resources = [aws_s3_bucket.media.arn]

    condition {
      test     = "StringLike"
      variable = "s3:prefix"
      values   = ["${var.s3_public_prefix}/*", var.s3_public_prefix]
    }
  }
}

resource "aws_iam_policy" "app_media" {
  name_prefix = "${var.project_name}-s3-media-"
  description = "Fase 1: acesso mínimo ao bucket de mídia (prefixo ${var.s3_public_prefix}/)"
  policy      = data.aws_iam_policy_document.app_media.json
}

resource "aws_iam_user_policy_attachment" "developer" {
  count      = var.developer_iam_user_name != "" ? 1 : 0
  user       = var.developer_iam_user_name
  policy_arn = aws_iam_policy.app_media.arn
}
