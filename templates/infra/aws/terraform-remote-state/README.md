# Remote state — S3 + DynamoDB (template mínimo)

Stack **pequeno** para criar na AWS:

- **Bucket S3** com versionamento e criptografia SSE-S3 (AES256), acesso público bloqueado.
- **Tabela DynamoDB** (`LockID`, string) para **lock** do backend S3 do Terraform.

Não substitui políticas IAM do operador nem configura backend nos outros stacks: isso fica no seu fluxo (copiar valores dos `outputs` para blocos `backend "s3"` — o backend **não** aceita interpolação; use nomes literais após o primeiro `apply` aqui).

## Quando aplicar

Em geral **antes** (ou em paralelo) dos stacks que usarão esse backend, para já existir bucket e tabela. O preset `aws-standard` copia `foundation` + esta camada; a **ordem de `terraform apply`** na conta é decisão do time (muitos aplicam **este** stack primeiro).

## Comandos

```bash
cd infra/aws/terraform-remote-state
cp terraform.tfvars.example terraform.tfvars
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

## Outputs úteis

Após `apply`:

```bash
terraform output -raw terraform_state_bucket_id
terraform output -raw terraform_state_lock_table_name
```

## Limitações (V2.3)

- **Sem** KMS dedicado, replicação cross-region, SCP de Organization nem políticas de bucket refinadas.
- **Sem** `force_destroy` no bucket: remoção segura de state exige processo manual se necessário.
- O **nome** do bucket inclui sufixo aleatório (`random_id`) para reduzir colisão global; altere `name_prefix` em `terraform.tfvars` se precisar.

## `template.json`

Versão do manifest desta pasta entra em `.project-factory.json` → `infraTemplates` e no `upgrade --dry-run`.
