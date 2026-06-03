export default [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      ".turbo/**",
      "dist/**",
      "coverage/**"
    ]
  },
  {
    files: ["**/*.{js,mjs,ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module"
    },
    rules: {}
  }
];
