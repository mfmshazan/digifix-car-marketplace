import pg from 'pg';

const { Pool } = pg;

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('Rider delivery database is not configured: DIRECT_URL or DATABASE_URL is required.');
}

const needsSsl = connectionString?.includes('supabase.co') || process.env.DB_SSL === 'true';

export const riderPool = new Pool({
  connectionString,
  ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  max: Number(process.env.RIDER_DB_POOL_MAX || 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export const riderQuery = (text, params = []) => riderPool.query(text, params);

export const getRiderClient = async () => riderPool.connect();

