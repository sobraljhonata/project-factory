/**
 * Modo `--yes`: título OpenAPI/README; se omitido ou vazio, usa o nome do pacote.
 */
export function resolveTitleNonInteractive(
  title: string | undefined,
  packageName: string,
): string {
  const t = title?.trim();
  return t && t.length > 0 ? t : packageName;
}
