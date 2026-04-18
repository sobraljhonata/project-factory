import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

/** CI / local: rápido, sem type-aware rules (evita project service pesado). */
export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    ignores: ["dist/**", "node_modules/**", "coverage/**", "**/*.js"],
  },
  {
    files: ["src/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-require-imports": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-restricted-syntax": [
        "warn",
        {
          selector: "Literal[value='Method not implemented']",
          message:
            "Substitua stubs por implementação real ou erro explícito de aplicação.",
        },
      ],
    },
  },
);
