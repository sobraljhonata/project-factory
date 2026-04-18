/**
 * Contrato de log injetável em casos de uso (não é “domínio DDD” do core — nome histórico).
 */
export interface DomainLogger {
  info(message: string, context?: Record<string, any>): void;
  error(message: string, context?: Record<string, any>): void;
}

export class NoopDomainLogger implements DomainLogger {
  info(): void {}
  error(): void {}
}