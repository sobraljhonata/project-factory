/**
 * Erros de parse/CLI com `--json`: um objeto em stdout (opção B), exit ≠ 0.
 */
export function writeCliParseErrorJson(
  command: "doctor" | "upgrade-dry-run",
  error: string,
  exitCode: number,
): void {
  const code = Number.isFinite(exitCode) ? exitCode : 1;
  console.log(
    JSON.stringify(
      {
        ok: false,
        command,
        error: error.trim(),
        exitCode: code,
      },
      null,
      2,
    ),
  );
}
