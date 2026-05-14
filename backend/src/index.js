import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from root folder
dotenv.config({ path: join(__dirname, '../../.env') });

// ─── Environment Validation ───────────────────────────────────────────────────
if (!process.env.DATABASE_URL) {
  console.error('[FATAL] DATABASE_URL environment variable is not set. Refusing to start.');
  process.exit(1);
}
if (!process.env.OPENROUTER_API_KEY) {
  console.warn('[WARN] OPENROUTER_API_KEY is not set. AI features will not function correctly.');
}
if (!process.env.JWT_SECRET) {
  console.warn('[WARN] JWT_SECRET is not set. Using insecure default — set this in production!');
}

import ticketRoutes from './routes/tickets.js';
import customerRoutes from './routes/customers.js';
import categoryRoutes from './routes/categories.js';
import tagRoutes from './routes/tags.js';
import knowledgeRoutes from './routes/knowledge.js';
import cannedResponseRoutes from './routes/cannedResponses.js';
import analyticsRoutes from './routes/analytics.js';
import aiRoutes from './routes/ai.js';
import userRoutes from './routes/users.js';
import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import voiceRoutes from './routes/voice.js';
import callRoutes from './routes/calls.js';
import aiFeaturesRoutes from './routes/aiFeatures.js';
import aiNewRoutes from './routes/aiNew.js';
import { apiLimiter, aiLimiter } from './middleware/rateLimiter.js';
import { sanitizeInputs } from './middleware/validate.js';

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5001;

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false,
}));

// Rate limiting
app.use('/api/', apiLimiter);

// CORS — origins from env (comma-separated). Falls back to permissive in dev.
const corsOriginsEnv = process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || '';
const corsOrigins = corsOriginsEnv.split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: corsOrigins.length > 0 ? corsOrigins : true,
  credentials: true,
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Input sanitization
app.use(sanitizeInputs);

// Make prisma available to routes
app.use((req, res, next) => {
  req.prisma = prisma;
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/canned-responses', cannedResponseRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ai', aiLimiter, aiRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/ai-features', aiLimiter, aiFeaturesRoutes);
app.use('/api/ai', aiLimiter, aiNewRoutes);






app.use('/api/ai', (await import('./routes/multilingual.js')).default);
app.use('/api/ai', (await import('./routes/proactiveTriggers.js')).default);
app.use('/api/ai', (await import('./routes/agentPerformance.js')).default);
app.use('/api/ai', (await import('./routes/healthScoring.js')).default);
app.use('/api/ai', (await import('./routes/churnPrediction.js')).default);
// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler middleware
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Error:`, err.message);
  console.error(err.stack);

  // Prisma errors
  if (err.code === 'P2002') {
    return res.status(409).json({ error: 'A record with this value already exists' });
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Record not found' });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired' });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: err.message });
  }

  // Default
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message || 'Something went wrong!'
  });
});

// Start server
// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-calls-voice-lack-analyze-call-sentiment-or-extract-call-tran', require('./routes/gap_calls_voice_lack_analyze_call_sentiment_or_extract_call_tran'));

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-cannedresponses-lacks-auto-generate-canned-response', require('./routes/gap_cannedresponses_lacks_auto_generate_canned_response'));

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-categories-tags-lack-ml-based-auto-tagging', require('./routes/gap_categories_tags_lack_ml_based_auto_tagging'));

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-no-live-chat-widget-for-website-embedding', require('./routes/gap_no_live_chat_widget_for_website_embedding'));

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-limited-crm-integration-no-salesforce-hubspot-adapter', require('./routes/gap_limited_crm_integration_no_salesforce_hubspot_adapter'));

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-limited-workflow-automation-auto-escalation-auto-close-auto', require('./routes/gap_limited_workflow_automation_auto_escalation_auto_close_auto'));

// // === Batch 02 Gaps & Frontend Mounts ===
app.use('/api/gap-no-payment-billing-module-exposed-stripe-only-stubbed', require('./routes/gap_no_payment_billing_module_exposed_stripe_only_stubbed'));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
