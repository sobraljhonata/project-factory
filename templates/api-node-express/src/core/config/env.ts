import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import * as z from "zod";

/** `true` quando os ficheiros do módulo opcional `auth-jwt` existem no projeto gerado. */
export function isProjectFactoryAuthJwtModuleInstalled(): boolean {
  const base = path.join(
    __dirname,
    "..",
    "..",
    "lib",
    "project-factory-modules",
    "auth-jwt",
    "jwt-verify-middleware",
  );
  return fs.existsSync(`${base}.js`) || fs.existsSync(`${base}.ts`);
}

// Carrega o .env específico por ambiente (ex.: .env.test nos testes)
const envFile = process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : ".env";
dotenv.config({
  path: [
    path.resolve(process.cwd(), envFile),
    path.resolve(process.cwd(), ".env"),
  ],
});

const EnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),

  API_VERSION: z.string().default("v1"),
  SWAGGER_ENABLED: z
    .union([z.string(), z.boolean()])
    .transform((v) => (typeof v === "string" ? v === "true" : Boolean(v)))
    .default(true),

  /**
   * Atrás do ALB com HTTPS (ACM): redireciona requisições HTTP detectadas via
   * X-Forwarded-Proto. Na ECS, ligado automaticamente quando há certificado no ALB.
   */
  FORCE_HTTPS_REDIRECT: z
    .union([z.string(), z.boolean()])
    .optional()
    .transform((v) => {
      if (v === undefined) return false;
      return typeof v === "string" ? v === "true" : Boolean(v);
    }),

  JWT_SECRET: z
    .string()
    .min(16, "JWT_SECRET deve ter pelo menos 16 caracteres"),
  JWT_ACCESS_SECRET: z
    .string()
    .min(16, "JWT_ACCESS_SECRET deve ter pelo menos 16 caracteres"),
  JWT_EXPIRES_IN: z.string().default("1h"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(16, "JWT_REFRESH_SECRET deve ter pelo menos 16 caracteres"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),

  /** Opcional: validação de `iss` nos tokens Bearer (módulo auth-jwt). */
  JWT_ISSUER: z
    .string()
    .optional()
    .transform((s) => (s !== undefined && s.trim() !== "" ? s.trim() : undefined)),
  /** Opcional: validação de `aud` nos tokens Bearer (módulo auth-jwt). */
  JWT_AUDIENCE: z
    .string()
    .optional()
    .transform((s) => (s !== undefined && s.trim() !== "" ? s.trim() : undefined)),

  UPDATE_MODEL: z
    .union([z.string(), z.boolean()])
    .transform((v) => (typeof v === "string" ? v === "true" : Boolean(v)))
    .default(false),

  /**
   * Se true (padrão), GET /ready chama `sequelize.authenticate()`.
   * Defina false só em cenários especiais (ex.: diagnóstico sem DB).
   */
  READINESS_CHECK_DB: z
    .union([z.string(), z.boolean()])
    .optional()
    .transform((v) => {
      if (v === undefined) return true;
      return typeof v === "string" ? v === "true" : Boolean(v);
    }),

  SALT: z.coerce.number().int().positive().default(10),

  /**
   * E-mail do usuário admin (seed). Em produção deve existir em process.env (ex.: ECS).
   */
  ADMIN_EMAIL: z
    .string()
    .email("ADMIN_EMAIL deve ser um e-mail válido")
    .default("admin@example.com"),

  /**
   * Senha inicial do admin (seed). Em produção deve vir do ambiente (ex.: Secrets Manager).
   * Em dev/test o default evita fricção local.
   */
  ADMIN_PASSWORD: z.string().min(1, "ADMIN_PASSWORD não pode ser vazia").default("admin123"),

  DB_DIALECT: z
    .enum(["mysql", "mariadb", "postgres", "sqlite"])
    .default("mysql"),
  DB_HOST: z.string().default("127.0.0.1"),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_DATABASE: z.string().default("db_app"),
  DB_USERNAME: z.string().default("user_app"),
  DB_PASSWORD: z.string().default(""),

  /** TLS para Aurora/RDS (mysql2). Em produção na AWS costuma ser true. */
  DB_SSL: z
    .union([z.string(), z.boolean()])
    .transform((v) => (typeof v === "string" ? v === "true" : Boolean(v)))
    .default(false),
  /** Valida certificado do servidor (false só para debug local com certificado custom). */
  DB_SSL_REJECT_UNAUTHORIZED: z
    .union([z.string(), z.boolean()])
    .transform((v) => (typeof v === "string" ? v === "true" : Boolean(v)))
    .default(true),
  /**
   * PEM customizado (opcional). Em MySQL, se vazio, o mysql2 usa o perfil embutido
   * "Amazon RDS" (aws-ssl-profiles) — prefira assim para RDS/Aurora.
   */
  DB_SSL_CA_PATH: z.string().optional(),

  /** Pool Sequelize — ajuste conforme tasks Fargate × max_connections do Aurora. */
  DB_POOL_MAX: z.coerce.number().int().positive().default(5),
  DB_POOL_MIN: z.coerce.number().int().min(0).default(0),
  DB_POOL_ACQUIRE_MS: z.coerce.number().int().positive().default(30_000),
  DB_POOL_IDLE_MS: z.coerce.number().int().positive().default(10_000),

  MEDIA_STORAGE: z.enum(["local", "s3"]).default("local"),
  S3_BUCKET: z.string().optional(),
  AWS_REGION: z.string().optional(),
  S3_PUBLIC_BASE_URL: z.string().optional(),
  /** Prefixo das chaves públicas no bucket (ex.: public/). Policy de leitura pública costuma usar esse prefixo. */
  S3_PUBLIC_PREFIX: z.string().default("public"),
  /**
   * Classe de armazenamento S3 (custo). INTELLIGENT_TIERING equilibra custo e acesso imediato para URLs públicas.
   * @see https://docs.aws.amazon.com/AmazonS3/latest/userguide/storage-class-intro.html
   */
  S3_STORAGE_CLASS: z
    .enum([
      "STANDARD",
      "REDUCED_REDUNDANCY",
      "STANDARD_IA",
      "ONEZONE_IA",
      "INTELLIGENT_TIERING",
      "GLACIER_IR",
    ])
    .default("INTELLIGENT_TIERING"),
  /**
   * Origem das URLs de mídia gerenciada (excluir objeto antigo só se a URL começar com isso).
   * Se vazio: em S3 usa S3_PUBLIC_BASE_URL; em local usa http://127.0.0.1:PORT
   */
  PUBLIC_MEDIA_BASE_URL: z.string().url().optional(),

  WEB_IMAGE_MAX_WIDTH: z.coerce.number().int().positive().default(1920),
  WEB_IMAGE_MAX_HEIGHT: z.coerce.number().int().positive().default(1080),
  WEB_IMAGE_WEBP_QUALITY: z.coerce.number().int().min(1).max(100).default(82),
})
  .superRefine((data, ctx) => {
    if (data.NODE_ENV !== "production") {
      return;
    }
    const pwd = process.env.ADMIN_PASSWORD;
    if (pwd === undefined || String(pwd).trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Em produção, ADMIN_PASSWORD deve estar definida no ambiente (ex.: AWS Secrets Manager na task ECS).",
        path: ["ADMIN_PASSWORD"],
      });
    }
    const email = process.env.ADMIN_EMAIL;
    if (email === undefined || String(email).trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Em produção, ADMIN_EMAIL deve estar definido no ambiente (ex.: variável plain na task ECS).",
        path: ["ADMIN_EMAIL"],
      });
    }
  })
  .superRefine((data, ctx) => {
    if (!isProjectFactoryAuthJwtModuleInstalled()) {
      return;
    }
    if (data.JWT_SECRET.length < 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Com o módulo opcional auth-jwt instalado, JWT_SECRET deve ter pelo menos 32 caracteres (entropia mínima). Gere com openssl rand -base64 48 ou equivalente.",
        path: ["JWT_SECRET"],
      });
    }
  });

const parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
  console.error(
    "Falha ao validar variáveis de ambiente:",
    parsed.error.flatten().fieldErrors,
  );
  process.exit(1);
}

export const ENV = parsed.data;
