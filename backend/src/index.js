import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { PrismaClient } from '@prisma/client';
import runtimeAi from './routes/runtimeAi.js';

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });

const testMode = process.env.NODE_ENV === 'test';
if (testMode && !process.env.CORS_ORIGINS) process.env.CORS_ORIGINS = `http://127.0.0.1:${process.env.FRONTEND_PORT || 5173}`;
if (testMode && !process.env.SUPPORT_WEBHOOK_SECRET) process.env.SUPPORT_WEBHOOK_SECRET = process.env.JWT_SECRET;
if (testMode && !process.env.SUPPORT_DATA_KEY) process.env.SUPPORT_DATA_KEY = process.env.MEMORY_ENCRYPTION_KEY_BASE64;

const { authenticate, checkBlacklist } = await import('./middleware/auth.js');
const { default: workforceTransition } = await import('./routes/workforceTransition.js');
const authRoutes = (await import('./routes/auth.js')).default;
const authoritative = (await import('./routes/authoritative.js')).default;
const webhookRoutes = (await import('./routes/supportWebhooks.js')).default;
const app = express();
const prisma = new PrismaClient();
const PORT = Number(process.env.PORT || 5001);
const origins = (process.env.CORS_ORIGINS || '').split(',').map(value => value.trim()).filter(Boolean);

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
if (!origins.length) throw new Error('CORS_ORIGINS is required');
if (!process.env.SUPPORT_WEBHOOK_SECRET || process.env.SUPPORT_WEBHOOK_SECRET.length < 32) throw new Error('SUPPORT_WEBHOOK_SECRET must be at least 32 characters');
if (Buffer.from(process.env.SUPPORT_DATA_KEY || '', 'base64').length !== 32) throw new Error('SUPPORT_DATA_KEY must decode to 32 bytes');

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: origins, credentials: true }));
app.use(express.json({ limit: '2mb', verify: (req, _res, buffer) => { req.rawBody = buffer; } }));
app.use((req, _res, next) => { req.prisma = prisma; next(); });
app.get('/api/health', async (_req, res) => {
  try { await prisma.$queryRaw`SELECT 1`; res.json({ status: 'ok' }); }
  catch { res.status(503).json({ status: 'unready' }); }
});
app.use('/api/auth', authRoutes);
app.use('/api/authoritative/support/webhooks',webhookRoutes);
app.use('/api/ai',authenticate,checkBlacklist,runtimeAi);
app.use('/api/authoritative/support',authenticate,checkBlacklist,authoritative);
app.use('/api/authoritative/support/workforce-transition',authenticate,checkBlacklist,workforceTransition);
app.use('/api', authenticate, checkBlacklist, (_req, res) => res.status(410).json({ error: 'legacy_route_quarantined', replacement: '/api/authoritative/support' }));
app.use((err, _req, res, _next) => {
  console.error(err.message);
  const status = /scope_denied/.test(err.message) ? 403 : /missing_|required|invalid_|unsupported|mismatch|not_|expired/.test(err.message) ? 422 : 500;
  res.status(status).json({ error: status === 500 ? 'internal_error' : err.message });
});

async function start() {
  const ready = await prisma.$queryRawUnsafe("SELECT to_regclass('support_cases')::text AS table_name");
  if (!ready[0].table_name) throw new Error('Database migration missing; run npm run migrate');
  app.listen(PORT, () => console.log(`support workflow API listening on ${PORT}`));
}

const invokedPath = process.argv[1] ? fs.realpathSync(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) start().catch(error => { console.error(error.message); process.exit(1); });
process.on('SIGTERM', async () => { await prisma.$disconnect(); process.exit(0); });

export { app, start, prisma };
