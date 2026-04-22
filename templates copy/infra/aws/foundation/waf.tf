resource "aws_wafv2_web_acl" "alb" {
  count = var.enable_waf ? 1 : 0

  name  = substr(replace("${local.name}-waf", "_", "-"), 0, 128)
  scope = "REGIONAL"

  default_action {
    allow {}
  }

  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 10

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = replace("${local.name}-waf-common", "_", "-")
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = replace("${local.name}-waf-acl", "_", "-")
    sampled_requests_enabled   = true
  }

  tags = local.common_tags
}

resource "aws_wafv2_web_acl_association" "alb" {
  count        = var.enable_waf ? 1 : 0
  resource_arn = aws_lb.main.arn
  web_acl_arn  = aws_wafv2_web_acl.alb[0].arn
}
