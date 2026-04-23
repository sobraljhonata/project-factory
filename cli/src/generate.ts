import fs from "node:fs";
import path from "node:path";

export type InfraLayerId =
  | "foundation"
  | "aurora"
  | "s3"
  | "terraformRemoteState";

export const INFRA_LAYERS: Record<
  InfraLayerId,
  { dir: string; label: string }
> = {
  foundation: {
    dir: "infra/aws/foundation",
    label: "Foundation (VPC, ECS, ALB, ECR, RDS opcional)",
  },
  aurora: {
    dir: "infra/aws/aurora-phase2",
    label: "Aurora MySQL (fase 2 — após foundation)",
  },
  s3: {
    dir: "infra/aws/s3-phase1",
    label: "S3 bucket (mídia pública)",
  },
  terraformRemoteState: {
    dir: "infra/aws/terraform-remote-state",
    label: "Remote state — bucket S3 (state) + DynamoDB (lock), template mínimo",
  },
};

export type GenerateVars = {
  PACKAGE_NAME: string;
  PROJECT_SLUG: string;
  API_TITLE: string;
  API_DESCRIPTION: string;
  API_VERSION: string;
  APP_PORT: string;
  AWS_REGION: string;
};

/** Manifest em `template.json` na raiz de cada template (semver simples MAJOR.MINOR.PATCH). */
export type TemplateManifest = {
  id: string;
  version: string;
};

const TEMPLATE_MANIFEST_FILE = "template.json";

/**
 * Nome estável do produto em `.project-factory.json` → `generator`.
 * Independente do nome do pacote npm (`@project-factory/cli`), para a CLI e o template evoluírem com versões desacopladas.
 */
export const PROJECT_FACTORY_PRODUCT_NAME = "project-factory";

/** Semver estrito (evita comparar strings de migração com formatos ambíguos). */
const SEMVER_TEMPLATE_RE = /^[0-9]+\.[0-9]+\.[0-9]+$/;

function assertSemverTemplate(version: string, context: string): void {
  const v = version.trim();
  if (!SEMVER_TEMPLATE_RE.test(v)) {
    throw new Error(
      `${context}: versão de template inválida "${version}". Use semver MAJOR.MINOR.PATCH (ex.: 1.0.0).`,
    );
  }
}

function parseTemplateManifest(
  raw: unknown,
  context: string,
  expectedId?: string,
): TemplateManifest {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error(`${context}: template.json deve ser um objeto JSON.`);
  }
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id.trim() : "";
  const version = typeof o.version === "string" ? o.version.trim() : "";
  if (id.length === 0) {
    throw new Error(`${context}: template.json precisa de "id" (string não vazia).`);
  }
  if (version.length === 0) {
    throw new Error(
      `${context}: template.json precisa de "version" (semver, ex.: 1.0.0).`,
    );
  }
  assertSemverTemplate(version, context);
  if (expectedId !== undefined && id !== expectedId) {
    throw new Error(
      `${context}: template.json tem id "${id}", esperado "${expectedId}".`,
    );
  }
  return { id, version };
}

/**
 * Lê e valida `template.json` no diretório do template (antes da cópia).
 * @param expectedId — se definido, o `id` do arquivo deve coincidir (evita manifest trocado entre pastas).
 */
export function readTemplateManifest(
  templateDir: string,
  expectedId?: string,
): TemplateManifest {
  const p = path.join(templateDir, TEMPLATE_MANIFEST_FILE);
  if (!fs.existsSync(p)) {
    throw new Error(`Manifest de template ausente: ${p}`);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Manifest de template inválido (JSON): ${p} — ${msg}`);
  }
  return parseTemplateManifest(parsed, p, expectedId);
}

function removeTemplateManifestFromOutput(outputDir: string): void {
  const p = path.join(outputDir, TEMPLATE_MANIFEST_FILE);
  try {
    if (fs.existsSync(p)) {
      fs.unlinkSync(p);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Falha ao remover ${p} do output: ${msg}`);
  }
}

/** Raiz `templates/` do checkout do factory (mesmo critério usado na geração). */
export function getTemplatesRoot(): string {
  return path.join(__dirname, "..", "..", "templates");
}

function copyDir(src: string, dest: string): void {
  try {
    fs.mkdirSync(dest, { recursive: true });
    for (const ent of fs.readdirSync(src, { withFileTypes: true })) {
      const s = path.join(src, ent.name);
      const d = path.join(dest, ent.name);
      if (ent.isDirectory()) {
        copyDir(s, d);
      } else {
        fs.copyFileSync(s, d);
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Falha ao copiar template (${src} → ${dest}): ${msg}`);
  }
}

/** Substitui apenas `{{KEY}}` para evitar colisão com sintaxe Terraform `${}`. */
export function applyTokens(root: string, tokens: Record<string, string>): void {
  const replaceInFile = (file: string): void => {
    const buf = fs.readFileSync(file);
    if (buf.includes(0)) {
      return;
    }
    let s = buf.toString("utf8");
    let changed = false;
    for (const [k, v] of Object.entries(tokens)) {
      const needle = `{{${k}}}`;
      if (s.includes(needle)) {
        s = s.split(needle).join(v);
        changed = true;
      }
    }
    if (changed) {
      fs.writeFileSync(file, s, "utf8");
    }
  };

  const walk = (dir: string): void => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        walk(p);
      } else {
        replaceInFile(p);
      }
    }
  };

  walk(root);
}

export type GenerateOptions = {
  targetDir: string;
  infra: InfraLayerId[];
  vars: GenerateVars;
  debug?: boolean;
};

function debugLog(debug: boolean | undefined, message: string, detail?: unknown): void {
  if (!debug) {
    return;
  }
  const line =
    detail === undefined
      ? `[project-factory:debug] ${message}`
      : `[project-factory:debug] ${message} ${JSON.stringify(detail)}`;
  console.error(line);
}

export type ProjectFactoryMetadata = {
  /** Produto gerador (estável: `project-factory`). */
  generator: string;
  /** Versão semver do pacote da CLI (`cli/package.json`) — ciclo de release independente do template. */
  generatorVersion: string;
  /** Identificador do stack copiado (ex.: `api-node-express`), de `template.json`. */
  template: string;
  /** Versão semver do stack em `templates/.../template.json` — evolui independente da CLI. */
  templateVersion: string;
  generatedAt: string;
  /** Camadas Terraform copiadas, na ordem selecionada (vazio se nenhuma). */
  infraTemplates: { id: string; version: string }[];
};

export function readGeneratorInfo(): { name: string; version: string } {
  const pkgPath = path.join(__dirname, "..", "package.json");
  const raw = fs.readFileSync(pkgPath, "utf8");
  const pkg = JSON.parse(raw) as { name?: string; version?: string };
  return {
    name: pkg.name ?? "@project-factory/cli",
    version: pkg.version ?? "0.0.0",
  };
}

/** Persiste proveniência para auditoria e base de futuras migrações (ver `docs/UPGRADE_VISION.md`). */
function writeProjectFactoryMetadata(
  targetDir: string,
  stackManifest: TemplateManifest,
  infraTemplates: TemplateManifest[],
  debug: boolean | undefined,
): void {
  const { version: cliVersion } = readGeneratorInfo();
  const meta: ProjectFactoryMetadata = {
    generator: PROJECT_FACTORY_PRODUCT_NAME,
    generatorVersion: cliVersion,
    template: stackManifest.id,
    templateVersion: stackManifest.version,
    generatedAt: new Date().toISOString(),
    infraTemplates: infraTemplates.map((m) => ({ id: m.id, version: m.version })),
  };
  const p = path.join(targetDir, ".project-factory.json");
  fs.writeFileSync(p, `${JSON.stringify(meta, null, 2)}\n`, "utf8");
  debugLog(debug, "metadata", { path: p, ...meta });
  /** Uma linha em stderr: rastreabilidade sem depender de abrir o JSON (logs/CI). */
  console.error(
    `[${PROJECT_FACTORY_PRODUCT_NAME}] Gerado: produto ${meta.generator}@${meta.generatorVersion}; template ${meta.template}@${meta.templateVersion}.`,
  );
}

export function generateProject(opts: GenerateOptions): void {
  const templatesRoot = getTemplatesRoot();
  const apiSrc = path.join(templatesRoot, "api-node-express");

  debugLog(opts.debug, "início", {
    templatesRoot,
    targetDir: opts.targetDir,
    infra: opts.infra,
    tokenKeys: Object.keys(opts.vars),
  });

  if (!fs.existsSync(apiSrc)) {
    throw new Error(`Template não encontrado: ${apiSrc}`);
  }

  const stackManifest = readTemplateManifest(apiSrc, "api-node-express");

  fs.mkdirSync(opts.targetDir, { recursive: true });
  copyDir(apiSrc, opts.targetDir);
  removeTemplateManifestFromOutput(opts.targetDir);
  debugLog(opts.debug, "api template copiado", { from: apiSrc });

  const tokens: Record<string, string> = { ...opts.vars };
  applyTokens(opts.targetDir, tokens);

  const infraTemplateList: TemplateManifest[] = [];

  for (const id of opts.infra) {
    const layer = INFRA_LAYERS[id];
    const from = path.join(templatesRoot, layer.dir);
    if (!fs.existsSync(from)) {
      throw new Error(`Layer infra ausente: ${from}`);
    }
    const manifest = readTemplateManifest(from, id);
    infraTemplateList.push(manifest);
    const to = path.join(opts.targetDir, layer.dir);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    copyDir(from, to);
    removeTemplateManifestFromOutput(to);
    applyTokens(to, tokens);
    debugLog(opts.debug, "infra copiada", { id, from, to });
  }

  writeInfraManifest(opts.targetDir, opts.infra);
  writeProjectFactoryMetadata(
    opts.targetDir,
    stackManifest,
    infraTemplateList,
    opts.debug,
  );
  assertNoUnresolvedPlaceholders(opts.targetDir);
}

const PLACEHOLDER_RE = /\{\{[A-Z][A-Z0-9_]*\}\}/g;

/**
 * Lista arquivos que ainda contêm `{{TOKEN}}` (mesma regra que a geração usa para falhar).
 */
export function findFilesWithUnresolvedPlaceholders(root: string): string[] {
  const offenders: string[] = [];

  const walk = (dir: string): void => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (ent.name === "node_modules" || ent.name === "dist") {
          continue;
        }
        walk(p);
        continue;
      }
      const buf = fs.readFileSync(p);
      if (buf.includes(0)) {
        continue;
      }
      const s = buf.toString("utf8");
      PLACEHOLDER_RE.lastIndex = 0;
      if (PLACEHOLDER_RE.test(s)) {
        offenders.push(p);
      }
    }
  };

  walk(root);
  return offenders;
}

/**
 * Falha rápido se algum `{{TOKEN}}` ficou no artefato gerado (silêncio = deploy quebrado).
 */
export function assertNoUnresolvedPlaceholders(root: string): void {
  const offenders = findFilesWithUnresolvedPlaceholders(root);
  if (offenders.length > 0) {
    throw new Error(
      `Placeholders não substituídos em:\n${offenders.join("\n")}`,
    );
  }
}

function writeInfraManifest(targetDir: string, infra: InfraLayerId[]): void {
  const p = path.join(targetDir, "infra", "aws", "GENERATED.md");
  const lines = [
    "# Infraestrutura gerada",
    "",
    "Stacks Terraform copiados pela CLI:",
    "",
    ...infra.map((id) => `- \`${INFRA_LAYERS[id].dir}\`: ${INFRA_LAYERS[id].label}`),
    "",
    "Em cada diretório: copie `terraform.tfvars.example` → `terraform.tfvars` e rode `terraform init && terraform plan`.",
    "",
  ];
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, lines.join("\n"), "utf8");
}
