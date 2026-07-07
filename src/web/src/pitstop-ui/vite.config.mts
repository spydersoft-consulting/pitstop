import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import path from "node:path";
import child_process from "node:child_process";

const isTest = process.env.NODE_ENV === "test" || process.env.VITEST === "true";
const isBuild =
  process.env.NODE_ENV === "production" || process.argv.includes("build");

let keyFilePath = "";
let certFilePath = "";

if (!isTest && !isBuild) {
  const baseFolder =
    process.env.APPDATA !== undefined && process.env.APPDATA !== ""
      ? `${process.env.APPDATA}/ASP.NET/https`
      : `${process.env.HOME}/.aspnet/https`;

  if (!fs.existsSync(baseFolder)) {
    fs.mkdirSync(baseFolder, { recursive: true });
  }

  const certificateArg = process.argv
    .map((arg) => arg.match(/--name=(?<value>.+)/i))
    .find(Boolean);
  const certificateName = certificateArg
    ? certificateArg.groups!.value
    : "pitstop-ui";

  certFilePath = path.join(baseFolder, `${certificateName}.pem`);
  keyFilePath = path.join(baseFolder, `${certificateName}.key`);

  if (!fs.existsSync(certFilePath) || !fs.existsSync(keyFilePath)) {
    if (
      0 !==
      child_process.spawnSync(
        "dotnet",
        [
          "dev-certs",
          "https",
          "--export-path",
          certFilePath,
          "--format",
          "Pem",
          "--no-password",
        ],
        { stdio: "inherit" },
      ).status
    ) {
      throw new Error("Could not create certificate.");
    }
  }
}

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ["chart.js/auto"],
  },
  build: {
    chunkSizeWarningLimit: 1200,
  },
  server: {
    proxy: {
      "^/pitstop": {
        target: "https://localhost:9081/",
        secure: false,
      },
      "^/.auth": {
        target: "https://localhost:9081/",
        secure: false,
      },
      "^/livez": {
        target: "https://localhost:9081/",
        secure: false,
      },
      "^/readyz": {
        target: "https://localhost:9081/",
        secure: false,
      },
    },
    port: parseInt(process.env.PORT ?? "5200"),
    cors: {
      origin: "*",
    },
    ...(!isTest &&
      !isBuild &&
      keyFilePath &&
      certFilePath && {
        https: {
          key: fs.readFileSync(keyFilePath),
          cert: fs.readFileSync(certFilePath),
        },
      }),
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./tests/setup.js",
    reporters: ["html", "junit"],
    outputFile: "./output/test/junit.xml",
    coverage: {
      provider: "v8",
      reporter: ["html", "cobertura", "lcov", "text"],
      reportsDirectory: "./output/coverage",
      exclude: [
        "**/node_modules/**",
        "**/tests/**",
        "**/dist/**",
        "**/output/**",
        "**/vite.config.mts",
        "**/eslint.config.js",
        "**/coverage/**",
        "**/.yarn/**",
        "**/src/api/**",
        "**/*.d.ts",
      ],
    },
  },
});
