import pkg from '@prisma/client';
const { PrismaClient } = pkg;

const globalForPrisma = globalThis;

function getRuntimeDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return undefined;

  try {
    const url = new URL(databaseUrl);

    // Supabase transaction pooling (port 6543) can move a logical client
    // between database connections. Prisma must therefore avoid prepared
    // statements when this connection mode is used.
    if (url.port === '6543') {
      url.searchParams.set('pgbouncer', 'true');

      // This is a persistent Express API with concurrent HTTP requests. A
      // single connection lets an interactive order transaction block every
      // other request until Prisma raises P2024, so keep a small bounded pool.
      const configuredLimit = Number(url.searchParams.get('connection_limit'));
      if (!Number.isFinite(configuredLimit) || configuredLimit < 5) {
        url.searchParams.set('connection_limit', '5');
      }

      if (!url.searchParams.has('pool_timeout')) {
        url.searchParams.set('pool_timeout', '20');
      }
    }

    return url.toString();
  } catch {
    // Let Prisma report malformed connection strings with its native error.
    return databaseUrl;
  }
}

const runtimeDatabaseUrl = getRuntimeDatabaseUrl();

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    ...(runtimeDatabaseUrl && {
      datasources: {
        db: { url: runtimeDatabaseUrl },
      },
    }),
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export default prisma;
