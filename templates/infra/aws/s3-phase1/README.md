# Fase 1 — Bucket S3 para mídia pública (prefixo `public/`)

## O que cria

- Bucket com criptografia SSE-S3 (AES256), versionamento opcional.
- Política de bucket: `s3:GetObject` anônimo apenas em `{prefix}/*` (padrão `public/*`).
- CORS: `GET`/`HEAD` com `AllowedOrigins: *` (adequado à Fase 1; endurecer depois).
- Política IAM **mínima** para a API: `PutObject`, `GetObject`, `DeleteObject` no prefixo; `ListBucket` condicionado ao prefixo.

## Pré-requisitos

- AWS CLI configurado (`aws configure` ou variáveis de ambiente).
- Terraform ≥ 1.5.

## Comandos

```bash
cd infra/aws/s3-phase1
terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

Anexar a política ao seu usuário IAM de desenvolvimento (uma vez):

```bash
terraform apply -var="developer_iam_user_name=SEU_USUARIO_IAM"
```

Ou crie access keys para um usuário que já tenha `iam_policy_arn` anexada manualmente no console.

## Outputs úteis

Após `apply`:

```bash
terraform output s3_public_base_url
terraform output bucket_name
```

Copie para o `.env` da API: `S3_PUBLIC_BASE_URL`, `S3_BUCKET`, `AWS_REGION`, `MEDIA_STORAGE=s3`.

## Destruir (rollback de infra)

```bash
terraform destroy
```

**Atenção:** apaga o bucket (e objetos, conforme regras de versionamento / `force_destroy` — este módulo não define `force_destroy`; buckets com objetos podem exigir esvaziamento manual antes).
