# Terraform remote state (S3 + DynamoDB lock)

Template mínimo referenciado por `INFRA_LAYERS.terraformRemoteState` e pelo preset `aws-standard`.

Copie/adapte os recursos (bucket S3 para state, tabela DynamoDB para lock) conforme políticas do seu time. O `project-factory` apenas copia estes arquivos; não executa `terraform apply`.
