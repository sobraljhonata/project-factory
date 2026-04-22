# Project Factory Goals

## Objetivo
Transformar o projeto atual em um boilerplate reutilizável que evolua para uma CLI geradora de projetos padronizados.

## V1
- API Node.js + Express + TypeScript + swagger + Jest + bcrypt + zod
- Infra AWS + Terraform
- Opcionais: foundation, Aurora, S3

## V2
- Docker/local
- presets mais ricos

## V3
- Azure

## V4
- Java / Spring Boot

## Princípios
- arquitetura evolutiva
- V1 pequena e funcional
- providers separados
- extensibilidade futura sem complexidade prematura

## Versionamento e rastre

O factory mantém **versão da CLI** (`generatorVersion`) e **versão do template** (`template` + `templateVersion`) separadas em `.project-factory.json`, para evolução independente e base para futuras migrações. Detalhes: `project-factory/docs/VERSIONING.md`; visão de comando `upgrade` (não implementado): `project-factory/docs/UPGRADE_VISION.md`.