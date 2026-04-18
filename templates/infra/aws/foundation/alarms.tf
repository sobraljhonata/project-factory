resource "aws_cloudwatch_metric_alarm" "target_5xx" {
  count = var.enable_cloudwatch_alarms ? 1 : 0

  alarm_name          = "${local.name}-target-5xx"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "HTTPCode_Target_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  statistic           = "Sum"
  threshold           = 20
  treat_missing_data  = "notBreaching"
  alarm_description   = "Soma de 5xx originados nas tasks (5 min)"

  dimensions = {
    LoadBalancer = local.alb_cloudwatch_dimension
    TargetGroup  = local.tg_cloudwatch_dimension
  }

  alarm_actions = var.alarm_sns_topic_arn != "" ? [var.alarm_sns_topic_arn] : null
}

resource "aws_cloudwatch_metric_alarm" "unhealthy_hosts" {
  count = var.enable_cloudwatch_alarms ? 1 : 0

  alarm_name          = "${local.name}-unhealthy-targets"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "UnHealthyHostCount"
  namespace           = "AWS/ApplicationELB"
  period              = 60
  statistic           = "Maximum"
  threshold           = 0
  treat_missing_data  = "notBreaching"
  alarm_description   = "Pelo menos um target unhealthy no target group"

  dimensions = {
    LoadBalancer = local.alb_cloudwatch_dimension
    TargetGroup  = local.tg_cloudwatch_dimension
  }

  alarm_actions = var.alarm_sns_topic_arn != "" ? [var.alarm_sns_topic_arn] : null
}
