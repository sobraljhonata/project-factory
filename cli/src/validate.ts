import fs from "node:fs";
import path from "node:path";

/** Nome de pacote npm não-scoped (kebab-case), alinhado ao slugify da CLI. */
const PACKAGE_NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Região AWS típica (ex.: us-east-1, eu-central-1). */
const AWS_REGION_RE = /^[a-z]{2}(-[a-z0-9]+)+-[0-9]$/;

/**
 * Rejeita caminhos que saem do cwd via `..` (ex.: `../out`), não normalizados.
 * Caminhos absolutos são permitidos (CI / diretório temporário).
 */
export function validateProjectDirArg(
  cwd: string,
  projectDirArg: string,
): void {
  const trimmed = projectDirArg.trim();
  if (trimmed === "" || trimmed === "." || trimmed === "..") {
    throw new Error(
      "Nome da pasta do projeto inválido: use um nome não vazio (ex.: minha-api).",
    );
  }

  if (path.isAbsolute(trimmed)) {
    return;
  }

  const segments = path.normalize(trimmed).split(path.sep);
  if (segments.includes("..")) {
    throw new Error(
      'Caminho inválido: não use ".." no caminho do projeto (ex.: evite ../out). Use pasta dentro do diretório atual ou um caminho absoluto.',
    );
  }
}

export function validatePackageNameForCli(name: string): void {
  const n = name.trim();
  if (n.length === 0) {
    throw new Error("Nome do pacote npm não pode ser vazio.");
  }
  if (n.length > 214) {
    throw new Error("Nome do pacote npm excede o limite de 214 caracteres.");
  }
  if (!PACKAGE_NAME_RE.test(n)) {
    throw new Error(
      `Nome do pacote npm inválido: "${n}". Use apenas letras minúsculas, números e hífens (kebab-case), ex.: minha-api.`,
    );
  }
}

/** Falha cedo se a região não parecer uma região AWS (evita typos em tfvars). */
export function validateAwsRegion(region: string): void {
  const r = region.trim();
  if (r.length < 6 || r.length > 32) {
    throw new Error(
      `Região AWS inválida (comprimento): "${region}". Ex.: us-east-1`,
    );
  }
  if (!AWS_REGION_RE.test(r)) {
    throw new Error(
      `Região AWS inválida: "${region}". Use o formato típico (ex.: us-east-1, eu-central-1).`,
    );
  }
}

export function resolveTargetDir(cwd: string, projectDirArg: string): string {
  return path.resolve(cwd, projectDirArg.trim());
}

export function validateTargetDirAvailable(targetDir: string): void {
  if (fs.existsSync(targetDir)) {
    const st = fs.statSync(targetDir);
    if (!st.isDirectory()) {
      throw new Error(`Destino já existe e não é pasta: ${targetDir}`);
    }
    if (fs.readdirSync(targetDir).length > 0) {
      throw new Error(
        `Diretório de destino não está vazio: ${targetDir}\n` +
          "Use outro nome de pasta ou esvazie o diretório antes de gerar.",
      );
    }
  }
}
