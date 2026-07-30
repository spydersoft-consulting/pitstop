// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";

export default tseslint.config(
  {
    files: ["**/*.ts"],
    ignores: ["**/playwright-report/**/*", "**/test-results/**/*"],
    extends: [eslint.configs.recommended, ...tseslint.configs.recommended, ...tseslint.configs.stylistic],
  },
  eslintPluginPrettierRecommended,
);
