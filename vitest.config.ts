import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/lib/__tests__/setup.ts"],
    globals: true,
    include: ["src/**/*.test.{ts,tsx}", "src/**/__tests__/**/*.test.{ts,tsx}"],
    css: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/__tests__/**",
        "src/**/*.d.ts",
        "src/**/types/**",
        "src/**/index.ts",
        "src/**/*.config.*",
        "src/app/layout.tsx",
        "src/app/globals.css",
      ],
      // thresholds: {
      //   perFile: true,
      //   lines: 50,
      //   statements: 50,
      // },
      // Включить, когда появятся тесты для страниц и компонентов
      // Сейчас только lib/ покрыта (auth.ts 85%, users.ts 71%)
      clean: true,
    },
  },
})
