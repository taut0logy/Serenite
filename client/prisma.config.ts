import { config } from "dotenv";
import { resolve } from "path";
// Load .env.local first (Next.js convention), then fall back to .env
config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });
import { defineConfig } from "prisma/config";

export default defineConfig({
  datasource: {
      url: process.env["DATABASE_URL"]
  },
  experimental: {
    externalTables: true,
  },
  tables: {
    external: [
      "public.langchain_pg_embedding",
      "public.langchain_pg_collection"
    ]
  },
})
