# Egress das tasks Fargate em subnets privadas (produção).
# Um NAT em uma AZ reduz custo; se a AZ do NAT cair, novas conexões de saída falham — para HA use um NAT por AZ.

resource "aws_eip" "nat" {
  count  = var.nat_gateway_enabled ? 1 : 0
  domain = "vpc"

  tags = merge(local.common_tags, { Name = "${local.name}-nat-eip" })

  depends_on = [aws_internet_gateway.main]
}

resource "aws_nat_gateway" "main" {
  count         = var.nat_gateway_enabled ? 1 : 0
  allocation_id = aws_eip.nat[0].id
  subnet_id     = aws_subnet.public[0].id

  tags = merge(local.common_tags, { Name = "${local.name}-nat" })
}

resource "aws_route_table" "private_egress" {
  count  = var.nat_gateway_enabled ? 1 : 0
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[0].id
  }

  tags = merge(local.common_tags, { Name = "${local.name}-private-egress-rt" })
}

resource "aws_route_table_association" "private_egress" {
  count          = var.nat_gateway_enabled ? length(aws_subnet.private) : 0
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private_egress[0].id
}
