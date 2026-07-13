import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required but not set.');
}

const poolerUrl = connectionString.includes('pgbouncer') 
  ? connectionString 
  : `${connectionString}${connectionString.includes('?') ? '&' : '?'}pgbouncer=true&connection_limit=5`;

// If connecting to a cloud database (like Supabase, Neon, etc.), we MUST use SSL/TLS
// to ensure that Server Name Indication (SNI) is sent during the handshake.
// Otherwise, the connection pooler/proxy (e.g. Supavisor) will throw:
// "no tenant identifier provided (external_id or sni_hostname required)"
const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
const pool = new Pool({
  connectionString: poolerUrl,
  ssl: isLocal ? undefined : { rejectUnauthorized: false }
});
const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({ adapter });
