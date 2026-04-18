check "ecs_autoscaling_capacity_order" {
  assert {
    condition     = var.ecs_autoscaling_max_capacity >= var.ecs_autoscaling_min_capacity
    error_message = "ecs_autoscaling_max_capacity deve ser >= ecs_autoscaling_min_capacity."
  }
}

check "ecs_autoscaling_desired_in_range" {
  assert {
    condition = !var.enable_ecs_autoscaling || (
      var.desired_count >= var.ecs_autoscaling_min_capacity &&
      var.desired_count <= var.ecs_autoscaling_max_capacity
    )
    error_message = "Com enable_ecs_autoscaling=true, desired_count deve ficar entre min e max (inclusive)."
  }
}
