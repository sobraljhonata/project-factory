/**
 * Roda antes de cada arquivo de teste (Jest setupFiles).
 * No GitHub Actions, CI=true e não há .env no repositório; env.ts exige JWT_*.
 * Valores são só para pipeline — não use em produção.
 */
if (process.env.CI === "true") {
  const placeholder = "ffffffffffffffffffffffffffffffff";
  if (!process.env.JWT_SECRET) process.env.JWT_SECRET = placeholder;
  if (!process.env.JWT_ACCESS_SECRET) process.env.JWT_ACCESS_SECRET = placeholder;
  if (!process.env.JWT_REFRESH_SECRET)
    process.env.JWT_REFRESH_SECRET = placeholder;
}
