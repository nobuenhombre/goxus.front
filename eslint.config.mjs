import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Global override — the rule is too aggressive: it blocks standard
// async data-fetching patterns (useEffect → fetch → setState) and auth guards.
// We keep it as "warn" so engineers notice it, but it does not break CI.
const reactHooksOverride = defineConfig({
  rules: {
    "react-hooks/set-state-in-effect": "warn",
  },
});

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  reactHooksOverride,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
