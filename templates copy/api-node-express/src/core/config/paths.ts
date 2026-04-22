// src/core/config/paths.ts
import path from "node:path";
import fs from "node:fs";
import fsp from "node:fs/promises";

export const isProd = __dirname.includes(path.sep + "dist" + path.sep);

export function resolveRuntimePath(relativeFromSrc: string) {
  const fromDist = path.resolve(__dirname, "..", relativeFromSrc);
  if (fs.existsSync(fromDist)) return fromDist;

  const fromSrc = path.resolve(process.cwd(), "src", relativeFromSrc);
  if (fs.existsSync(fromSrc)) return fromSrc;

  return path.resolve(process.cwd(), relativeFromSrc);
}

export function resolveRuntimeDir(relativeFromSrcDir: string) {
  const p = resolveRuntimePath(relativeFromSrcDir);
  return fs.existsSync(p) ? p : null;
}

/**
 * ---------- FS helpers (para infra) ----------
 */

export function normalizeFolder(folder?: string) {
  if (!folder) return "";
  // remove barra inicial e normaliza separadores (evita path traversal "leve")
  const cleaned = folder.replace(/^\//, "").replace(/\.\.(\/|\\)/g, "");
  return cleaned;
}

export function joinFs(rootDir: string, folder?: string) {
  const normalized = normalizeFolder(folder);
  return normalized ? path.join(rootDir, normalized) : rootDir;
}

export async function ensureDir(dirPath: string) {
  await fsp.mkdir(dirPath, { recursive: true });
}

export async function writeBufferFile(filePath: string, buffer: Buffer) {
  await fsp.writeFile(filePath, buffer);
}

/**
 * Monta URL/path público usando POSIX (mesmo em Windows),
 * para ficar consistente em responses HTTP.
 */
export function joinPublicPath(publicBasePath: string, folder: string, filename: string) {
  const base = publicBasePath.replace(/\/$/, "");
  const normalizedFolder = normalizeFolder(folder).split(path.sep).join("/");
  const withFolder = normalizedFolder ? `${base}/${normalizedFolder}` : base;
  return `${withFolder}/${filename}`.replace(/\/+/g, "/");
}