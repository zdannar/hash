/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  extends: ["@local/eslint-config/legacy-base-to-refactor.cjs"],
  parserOptions: {
    tsconfigRootDir: __dirname,
    project: ["tsconfig.json"],
  },
  plugins: ["@typescript-eslint", "canonical", "unicorn"],
  rules: {
    // @todo Re-enable this rule once ESLint config is refactored
    "@typescript-eslint/restrict-plus-operands": "off",
    "jsx-a11y/label-has-associated-control": "off",
    "import/no-default-export": "error",
    "no-restricted-imports": [
      "error",
      {
        paths: [
          {
            name: "next",
            importNames: ["Link"],
            message:
              "Please use the custom wrapper component in src/shared/ui component instead to ensure Next.js and MUI compatibility.",
          },
          {
            name: "next/link",
            message:
              "Please use the custom wrapper component in src/shared/ui component instead to ensure Next.js and MUI compatibility.",
          },
          {
            name: "@mui/material/*",
            message: "Please import from @mui/material instead",
          },
          {
            name: "@mui/material",
            importNames: [
              "Avatar",
              "IconButton",
              "Chip",
              "Popover",
              "TextField",
              "Select",
              "Dialog",
              "Menu",
              "Link",
              "Button",
              "MenuItem",
            ],
            message:
              "Please use the custom wrapper component from src/shared/ui for Link, Button and MenuItem and from '@hashintel/hash-design-system' for every other component.",
          },
          {
            name: "notistack",
            importNames: ["useSnackbar"],
            message:
              "Please use the custom src/components/hooks/useSnackbar hook instead.",
          },
        ],
      },
    ],
  },
  overrides: [
    {
      files: [
        "./src/pages/**/*.api.ts",
        "./src/pages/**/*.page.ts",
        "./src/pages/**/*.page.tsx",
        "**/__mocks__/**",
      ],
      rules: {
        "import/no-default-export": "off",
      },
    },
    {
      files: ["**/shared/**/*", "./src/pages/**/*"],
      rules: {
        "canonical/filename-no-index": "error",
        "unicorn/filename-case": "error",
      },
    },
  ],
};