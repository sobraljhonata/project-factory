# Foundation — VPC, RDS MySQL, ECR, ALB, ECS Fargate, Secrets Manager, IAM

Stack alinhado à documentação em `docs/deployment/`. **Padrão (laboratório):** sem NAT — tasks Fargate em **subnet pública** com IP público. **Produção:** ative `nat_gateway_enabled`, `acm_certificate_arn`, endurecimento de RDS, alarmes, WAF e autoscaling via variáveis — veja **`terraform.tfvars.production.example`**.

## Ordem recomendada

1. **Criar S3** (Fase 1): `infra/aws/s3-phase1` → guarde `bucket_name` e `s3_public_base_url`.
2. **Este stack** (`foundation`): VPC, banco, ALB, cluster ECS, segredos, serviço com imagem placeholder (nginx) ou sua imagem.
3. **Por último** (na sua máquina): `aws configure` ou perfil IAM com o qual você roda `terraform` **e**, separadamente, credenciais para o dia a dia na AWS Console.

> O Terraform **não** substitui a criação da **conta AWS**. Quem executa `terraform apply` precisa de um **principal IAM** (usuário ou role) com permissões amplas na conta alvo (ver seção “Permissões do operador Terraform” abaixo).

## Pré-requisitos

- Terraform ≥ 1.5, AWS CLI (opcional mas útil).
- Bucket S3 da Fase 1 já existente **na mesma região** `aws_region`.
- Arquivo `terraform.tfvars` (use `terraform.tfvars.example` como base). **Não commite** segredos.

## Aplicar

```bash
cd infra/aws/foundation
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

## Depois do apply

- **ALB**: `terraform output alb_public_base_url` (http ou https conforme ACM) — com nginx padrão, `curl` na URL deve retornar HTML.
- **ECR**: faça build da API, autentique no ECR, `docker push` para `terraform output ecr_repository_url`.
- **Atualizar serviço para a API Node**  
  Ajuste no `terraform.tfvars` (ou `-var`): `container_image` (URI ECR), `container_port = 3000`, `health_check_path = "/health"`, depois `terraform apply`.

### Outputs de rede (`private_subnet_ids` / `public_subnet_ids`)

Esses outputs existem no `outputs.tf` para integrar o stack **Aurora** (`infra/aws/aurora-phase2`). Eles **só passam a existir no state** depois que você roda **`terraform apply` no foundation** com essa versão do código (mesmo que o plan não altere recursos — o state é atualizado com os novos outputs).

Se aparecer `Output "private_subnet_ids" not found`, rode:

```bash
cd infra/aws/foundation
terraform apply   # confirme o plan (pode ser “no changes” nos recursos)
```

**Sem esperar pelo bloco `output`:** dá para ler os IDs direto do state/config:

```bash
cd infra/aws/foundation
printf '%s\n' 'jsonencode(aws_subnet.private[*].id)' | terraform console
printf '%s\n' 'jsonencode(aws_subnet.public[*].id)' | terraform console
```

## Migrações de banco

O RDS **não** fica público. Opções:

- Rodar `db:migrate` / `db:seed` a partir de um **bastion** na VPC, ou
- Job de CI com rede na VPC, ou
- Task one-off Fargate com a mesma imagem da API (comando override), ou
- (Só laboratório) expor RDS — **não** recomendado; não está neste módulo.

## Secrets Manager

Segredo `${project_name}-${environment}/app/runtime` (JSON) com: `JWT_SECRET`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `DB_PASSWORD` (igual à senha master gerada do RDS ou ao externo).

- **`secret_recovery_window_in_days`**: `0` no lab (exclusão imediata); **produção: 7–30** (janela de recuperação).
- Rotação automática de segredos e políticas IAM mais rígidas podem ser camadas posteriores.

## Permissões do operador Terraform (resumo)

O usuário/role que roda o Terraform precisa, entre outras, de permissões para criar/alterar: VPC, subnets, SG, RDS, ALB, ECS, ECR, IAM roles/policies, Secrets Manager, CloudWatch Logs. Em ambiente de laboratório costuma-se usar `AdministratorAccess` ou uma política custom agregando os serviços acima.

**Isso é independente** do IAM da **task** ECS (task role S3 + execution role), que o próprio Terraform cria.

## Destruir

```bash
terraform destroy
```

RDS com `skip_final_snapshot = true` (laboratório). Ajuste para produção.

## Variáveis importantes

| Variável | Uso |
|----------|-----|
| `media_bucket_name`, `s3_public_base_url` | Devem bater com o output do `s3-phase1` |
| `jwt_*` | ≥ 16 caracteres cada |
| `container_image` / `container_port` / `health_check_path` | nginx → depois imagem ECR da API |
| `nat_gateway_enabled` | `true` = tasks em subnet **privada** + egress NAT (produção) |
| `acm_certificate_arn` | ARN ACM na mesma região → HTTPS + redirect 80→443 |
| `rds_*`, `secret_recovery_window_in_days` | Endurecimento de banco e segredo |
| `ecs_log_retention_in_days`, `ecs_container_insights` | Observabilidade |
| `enable_ecs_autoscaling`, `ecs_autoscaling_*` | Autoscaling CPU 70% |
| `enable_cloudwatch_alarms`, `alarm_sns_topic_arn` | Alarmes 5xx / unhealthy |
| `enable_waf` | WAFv2 regional no ALB (managed rules) |

## SSL MySQL (`DB_SSL=true`)

A imagem Docker copia `certs/` para `/app/certs/`. A task **não** define `DB_SSL_CA_PATH`: o mysql2 usa o perfil **Amazon RDS** (`aws-ssl-profiles`). Ver [phase3-ecs-publish.md](../../../docs/deployment/phase3-ecs-publish.md).

## HTTPS no ALB (front / navegador)

`https://` na **443** exige **`acm_certificate_arn`** no `terraform.tfvars` (certificado ACM na mesma região + DNS do host apontando para o ALB). Sem isso, só **HTTP:80** funciona. Detalhes: seção **HTTPS no ALB (certificado ACM)** em [phase3-ecs-publish.md](../../../docs/deployment/phase3-ecs-publish.md).

## HTTPS sem domínio próprio (API Gateway)

Com **`enable_apigatewayv2_alb_proxy = true`**, o Terraform cria um **API Gateway HTTP API** com URL **`https://{api-id}.execute-api.{região}.amazonaws.com`** (TLS gerenciado pela AWS). Ver [api-gateway-https-front.md](../../../docs/deployment/api-gateway-https-front.md) e o output **`api_gateway_https_base_url`**.

## Aurora em vez do RDS deste stack

1. Aplique **aurora-phase2** (mesma VPC/subnets do foundation ou equivalente).
2. No **foundation** `terraform.tfvars`: `use_managed_rds = false`, `external_db_host` (writer), `external_db_password`, e alinhe `db_name` / `db_username` ao cluster.
3. No **aurora-phase2**, passe em `allowed_security_group_ids` o output **`ecs_tasks_security_group_id`** do foundation (ingress MySQL 3306 das tasks).

## Scripts de deploy (Fase 3)

Na raiz do repositório (após `aws configure` e Docker):

- `./scripts/ecr-build-push.sh` — exige `AWS_REGION`, `ECR_REPOSITORY_URL` (output `ecr_repository_url`).
- `./scripts/ecs-force-new-deployment.sh` — exige `AWS_REGION`, `ECS_CLUSTER_NAME`, `ECS_SERVICE_NAME` (outputs homônimos).

Smoke no ALB: `SMOKE_BASE_URL=$(terraform output -raw alb_public_base_url) npm run smoke:alb` — ver `docs/deployment/phase3-ecs-publish.md`.
