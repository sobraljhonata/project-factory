# -----------------------------------------------------------------------------
# API Gateway HTTP API (v2) — HTTPS no domínio padrão *.execute-api.*.amazonaws.com
# Integração HTTP_PROXY para o ALB público (listener :80 → target group).
# Sem ACM nem domínio próprio no cliente; certificado gerenciado pela AWS no API GW.
# -----------------------------------------------------------------------------

resource "aws_apigatewayv2_api" "public_https" {
  count = var.enable_apigatewayv2_alb_proxy ? 1 : 0

  name          = substr(replace("${local.name}-public-api", "_", "-"), 0, 128)
  protocol_type = "HTTP"

  dynamic "cors_configuration" {
    for_each = length(var.api_gateway_cors_allow_origins) > 0 ? [1] : []
    content {
      allow_origins = var.api_gateway_cors_allow_origins
      allow_methods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"]
      allow_headers = ["authorization", "content-type", "x-correlation-id"]
      max_age       = 86400
    }
  }

  tags = merge(local.common_tags, { Name = "${local.name}-apigw-public" })
}

resource "aws_apigatewayv2_integration" "alb_proxy" {
  count = var.enable_apigatewayv2_alb_proxy ? 1 : 0

  api_id = aws_apigatewayv2_api.public_https[0].id

  integration_type   = "HTTP_PROXY"
  integration_method = "ANY"
  integration_uri    = "http://${aws_lb.main.dns_name}/{proxy}"

  depends_on = [aws_lb_listener.http]
}

resource "aws_apigatewayv2_integration" "alb_root" {
  count = var.enable_apigatewayv2_alb_proxy ? 1 : 0

  api_id = aws_apigatewayv2_api.public_https[0].id

  integration_type   = "HTTP_PROXY"
  integration_method = "ANY"
  integration_uri    = "http://${aws_lb.main.dns_name}/"

  depends_on = [aws_lb_listener.http]
}

resource "aws_apigatewayv2_route" "proxy" {
  count = var.enable_apigatewayv2_alb_proxy ? 1 : 0

  api_id    = aws_apigatewayv2_api.public_https[0].id
  route_key = "ANY /{proxy+}"
  target    = "integrations/${aws_apigatewayv2_integration.alb_proxy[0].id}"
}

resource "aws_apigatewayv2_route" "root" {
  count = var.enable_apigatewayv2_alb_proxy ? 1 : 0

  api_id    = aws_apigatewayv2_api.public_https[0].id
  route_key = "ANY /"
  target    = "integrations/${aws_apigatewayv2_integration.alb_root[0].id}"
}

resource "aws_apigatewayv2_stage" "apigw_default" {
  count = var.enable_apigatewayv2_alb_proxy ? 1 : 0

  api_id      = aws_apigatewayv2_api.public_https[0].id
  name        = "$default"
  auto_deploy = true

  tags = merge(local.common_tags, { Name = "${local.name}-apigw-stage" })
}
