// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const eslintPluginPrettierRecommended = require('eslint-plugin-prettier/recommended');

module.exports = defineConfig([
  expoConfig,
  eslintPluginPrettierRecommended,
  {
    // src/db/migrations is drizzle-kit output.
    ignores: ['dist/*', '.expo/*', 'expo-env.d.ts', 'src/db/migrations/*'],
  },
]);
