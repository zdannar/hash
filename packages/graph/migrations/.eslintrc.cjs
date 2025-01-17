/** @type {import("eslint").Linter.Config} */
module.exports = {
  ...require("@local/eslint-config/generate-workspace-config.cjs")(__dirname),
  env: {
    node: true,
  },
  overrides: [
    {
      files: ["**/migration/*.ts"],
      rules: {
        "unicorn/filename-case": "off",
      },
    },
  ],
};
