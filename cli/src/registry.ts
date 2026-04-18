/**
 * Extensibilidade futura: novas stacks (ex.: spring-boot) e providers (ex.: azure)
 * registrados aqui sem acoplar o motor de geração.
 */
export const STACK_IDS = ["node-express-ts"] as const;
export type StackId = (typeof STACK_IDS)[number];

export const INFRA_PROVIDERS = {
  /** Único provider com templates na V1 */
  aws: { id: "aws", label: "Amazon Web Services (Terraform)" },
  /** Placeholder documental — sem templates */
  azure: { id: "azure", label: "Azure (planejado)" },
  onPrem: { id: "on-prem", label: "On-premise (planejado)" },
} as const;
