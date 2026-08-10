import { defineConfig, globalIgnores } from "eslint/config";
import prettier from "eslint-config-prettier/flat";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  {
    rules: {
      "react/no-unescaped-entities": "off",
      // Next 16's React plugin enables compiler-oriented rules that flag
      // pre-existing application patterns. React Compiler adoption is deferred.
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    files: ["e2e/**/*.{ts,tsx}"],
    rules: {
      // Playwright fixtures receive a callback named `use`; it is not React's
      // `use` API and must not be validated as a Hook.
      "react-hooks/rules-of-hooks": "off",
    },
  },
  prettier,
  globalIgnores([
    ".history/**",
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
