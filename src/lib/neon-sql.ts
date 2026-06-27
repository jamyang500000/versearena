// Neon HTTP driver — stateless, no connection pool, no cold-start timeouts.
// Use this for hot paths (message polling/sending) instead of Prisma.
import { neon } from "@neondatabase/serverless";

// Uses DIRECT_URL (not pgbouncer) — the HTTP API bypasses pgbouncer entirely
export const sql = neon(process.env.DIRECT_URL!);
