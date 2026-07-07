// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default tseslint.config(
  {
    files: ["**/*.ts", "**/*.tsx"],
    ignores: [
      "**/build/**/*",
      "**/dist/**/*",
      "**/output/**/*",
      "**/coverage/**/*",
    ],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
    ],
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-inferrable-types": "off",
    },
  },
  {
    files: ["**/context/**/*.ts", "**/context/**/*.tsx"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  },
  eslintPluginPrettierRecommended,
);
