# Fase 2 — Aurora MySQL (sem RDS Proxy)

Cluster **Aurora MySQL compatível com 8.0**, **1 instância writer**, endpoint direto (sem proxy). Alinhado ao Sequelize/`mysql2` já usados no projeto.

## Pré-requisitos

- VPC e **pelo menos 2 subnets em AZs diferentes** (ex.: stack `foundation`).
- Terraform + credenciais AWS com permissão para RDS, EC2 SG, Secrets Manager, subnet groups.

### De onde vêm `vpc_id` e `database_subnet_ids`?

Com o stack **`infra/aws/foundation`** já aplicado na mesma conta/região:

```bash
cd ../foundation
terraform output -raw vpc_id
terraform output -json private_subnet_ids   # recomendado: Aurora em subnets privadas
# ou, só para laboratório com publicly_accessible = true:
terraform output -json public_subnet_ids
```

Se der **Output "private_subnet_ids" not found**: o state do foundation ainda não foi atualizado com esses outputs — rode **`terraform apply`** uma vez no `foundation` (pode não mudar infra). Ou use já:

```bash
printf '%s\n' 'jsonencode(aws_subnet.private[*].id)' | terraform console
```

Copie os IDs para `terraform.tfvars` do Aurora (`database_subnet_ids` é uma lista com **pelo menos 2 strings**).

**Automatizar sem copiar/colar:** use backend remoto (S3 + DynamoDB) nos dois stacks e um bloco `data "terraform_remote_state" "foundation"` no Aurora apontando para o state do foundation — aí `vpc_id` e `database_subnet_ids` vêm dos outputs via HCL (exemplo no final da doc em `docs/deployment/aurora-phase2.md`).

## Aplicar

```bash
cd infra/aws/aurora-phase2
cp terraform.tfvars.example terraform.tfvars
# Edite vpc_id, subnets, allowed_cidr_blocks, publicly_accessible

terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

Credenciais após o apply:

```bash
aws secretsmanager get-secret-value \
  --secret-id "$(terraform output -raw secrets_manager_arn)" \
  --query SecretString --output text | jq .
```

## Integração com o stack foundation

1. `terraform output vpc_id` e subnets **públicas** (para lab com `publicly_accessible`) ou **privadas** + bastion/VPN (padrão mais seguro).
2. Opcional: `allowed_security_group_ids` com o SG das tasks ECS (`terraform output` do foundation — consulte `aws_security_group.ecs_tasks` no state do foundation).

Documentação operacional completa: [`docs/deployment/aurora-phase2.md`](../../../docs/deployment/aurora-phase2.md).
