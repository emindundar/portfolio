import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "gsap", message: "Only inside components/motion, components/canvas, components/terminal or lib/motion.ts" },
            { name: "@gsap/react", message: "Only inside components/motion, components/canvas, components/terminal or lib/motion.ts" },
            { name: "lenis", message: "Only inside components/motion or lib/motion.ts" },
            { name: "lenis/react", message: "Only inside components/motion or lib/motion.ts" },
            { name: "ogl", message: "Only inside components/canvas" },
            { name: "motion", message: "Only inside components/motion" },
            { name: "motion/react", message: "Only inside components/motion" },
          ],
          patterns: [{ group: ["gsap/*"], message: "Only inside components/motion, components/canvas or lib/motion.ts" }],
        },
      ],
    },
  },
  {
    files: ["components/motion/**", "components/canvas/**", "components/terminal/**", "lib/motion.ts"],
    rules: { "no-restricted-imports": "off" },
  },
]);

export default eslintConfig;
