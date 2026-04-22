# Boilerplate Architecture

## Estrutura sugerida
- núcleo comum da aplicação
- templates de stack
- templates de provider de infra
- presets de combinação
- gerador/CLI

## Objetivo da V1
Gerar projetos padronizados para API Node.js + Express + TypeScript com AWS + Terraform.

## Diretrizes
- core da aplicação separado de provider AWS
- infra separada por provider
- presets como composição de opções comuns