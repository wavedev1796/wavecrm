const { readFileSync } = require('node:fs');
const { parseEnv } = require('node:util');
const { resolve } = require('node:path');
const { PrismaClient } = require('@wave/database');
(async () => {
  for (const file of ['.env', '.env.test.local']) {
    const config = parseEnv(readFileSync(resolve(__dirname, '..', file), 'utf8'));
    const prisma = new PrismaClient({ datasources: { db: { url: config.DATABASE_URL } } });
    try {
      const migrations = await prisma.$queryRawUnsafe('SELECT migration_name, finished_at FROM "_prisma_migrations" WHERE rolled_back_at IS NULL ORDER BY migration_name');
      const history = await prisma.$queryRawUnsafe('SELECT to_regclass(\'public."DealStageHistory"\') ::text AS history');
      console.log(JSON.stringify({ file, host: new URL(config.DATABASE_URL).hostname, migrations, history }));
    } catch (error) { console.log(JSON.stringify({ file, code: error.code, error: error.name })); process.exitCode = 1; }
    finally { await prisma.$disconnect(); }
  }
})();
