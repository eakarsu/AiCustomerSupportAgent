import 'dotenv/config';
import { readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const cli = require.resolve('prisma/build/index.js');
const backend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const migrations = path.join(backend, 'prisma', 'migrations');

for (const directory of readdirSync(migrations, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()) {
  const file = path.join(migrations, directory, 'migration.sql');
  const result = spawnSync(
    process.execPath,
    [cli, 'db', 'execute', '--file', file, '--schema', path.join(backend, 'prisma', 'schema.prisma')],
    { cwd: backend, stdio: 'inherit', env: process.env },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
