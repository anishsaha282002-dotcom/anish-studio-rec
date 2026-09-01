import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    files: ["src/**/*.ts"],
    rules: {
      // Read-only enforcement: no wallet/signing code paths allowed
      "no-restricted-syntax": [
        "error",
        {
          selector: "Identifier[name='Keypair']",
          message:
            "Keypair is forbidden — this project is read-only and must never sign transactions.",
        },
        {
          selector:
            "MemberExpression[object.name='Keypair'], CallExpression[callee.object.name='Keypair']",
          message:
            "Keypair usage is forbidden — this project is read-only.",
        },
        {
          selector: "Identifier[name='signTransaction']",
          message:
            "signTransaction is forbidden — this project is read-only.",
        },
        {
          selector: "Identifier[name='sendTransaction']",
          message:
            "sendTransaction is forbidden — this project is read-only.",
        },
        {
          selector: "Identifier[name='PRIVATE_KEY']",
          message:
            "PRIVATE_KEY is forbidden — no secrets or signing keys in source code.",
        },
      ],
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "@solana/web3.js",
              importNames: ["Keypair"],
              message:
                "Keypair import is forbidden — this project is read-only.",
            },
          ],
        },
      ],
    },
  },
  {
    ignores: ["dist/", "node_modules/", "vitest.config.ts"],
  },
);
