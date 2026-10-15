import { defineConfig } from 'drizzle-kit';

// Local SQLite schema on the phone. `pnpm db:generate` writes a migration + migrations.js,
// which the app bundles and applies on start (src/db/DatabaseGate.tsx).
export default defineConfig({
  dialect: 'sqlite',
  driver: 'expo',
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
});
