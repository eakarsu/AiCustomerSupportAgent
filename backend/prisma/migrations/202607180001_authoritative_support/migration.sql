CREATE TABLE IF NOT EXISTS "User" (
 id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password TEXT NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'agent',
 "tenantId" TEXT, "subjectId" TEXT, avatar TEXT, "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE TABLE IF NOT EXISTS "PasswordReset" (
 id TEXT PRIMARY KEY, email TEXT NOT NULL, token TEXT NOT NULL UNIQUE, "expiresAt" TIMESTAMP(3) NOT NULL,
 used BOOLEAN NOT NULL DEFAULT FALSE, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "EmailVerification" (
 id TEXT PRIMARY KEY, "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE RESTRICT, email TEXT NOT NULL, token TEXT NOT NULL UNIQUE,
 verified BOOLEAN NOT NULL DEFAULT FALSE, "expiresAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS "BlacklistedToken" (
 id TEXT PRIMARY KEY, token TEXT NOT NULL UNIQUE, "expiresAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subjectId" TEXT;
UPDATE "User" SET "tenantId" = 'default-tenant', "subjectId" = id
WHERE "tenantId" IS NULL OR "subjectId" IS NULL;
CREATE INDEX IF NOT EXISTS support_users_tenant_idx ON "User" ("tenantId", id);
CREATE TABLE IF NOT EXISTS support_cases (
 id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, customer_id TEXT NOT NULL, owner_id TEXT,
 state TEXT NOT NULL CHECK(state IN ('validated','assigned','draft_response','human_review','approved','sent','waiting','resolved','closed','escalated','recovered')),
 channel TEXT NOT NULL, subject TEXT NOT NULL, body_hash CHAR(64) NOT NULL, body_ciphertext BYTEA, body_iv BYTEA, body_auth_tag BYTEA,
 consent JSONB NOT NULL, approval_id TEXT, draft_author_id TEXT,
 expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS support_call_analyses (
 id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, case_id TEXT NOT NULL REFERENCES support_cases(id), call_id TEXT NOT NULL,
 recording_checksum CHAR(64) NOT NULL, transcript_ciphertext BYTEA, transcript_iv BYTEA, transcript_auth_tag BYTEA, transcript_hash CHAR(64) NOT NULL, consent_id TEXT NOT NULL,
 model_version TEXT NOT NULL, sentiment JSONB, label TEXT NOT NULL DEFAULT 'ADVISORY SENTIMENT - HUMAN REVIEW REQUIRED',
 reviewed_by TEXT, review_disposition TEXT CHECK(review_disposition IN ('accepted','corrected','rejected')), review_notes TEXT, reviewed_at TIMESTAMPTZ,
 expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS support_webhook_receipts (
 id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, provider TEXT NOT NULL, provider_event_id TEXT NOT NULL, payload_hash CHAR(64) NOT NULL,
 received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), processed_at TIMESTAMPTZ, UNIQUE(tenant_id,provider,provider_event_id)
);
CREATE TABLE IF NOT EXISTS support_deliveries (
 id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, case_id TEXT REFERENCES support_cases(id), provider TEXT NOT NULL,
 operation TEXT NOT NULL, idempotency_key TEXT NOT NULL, payload_hash CHAR(64) NOT NULL, payload JSONB NOT NULL,
 status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','leased','retrying','confirmed','dead_letter')),
 attempts INTEGER NOT NULL DEFAULT 0, max_attempts INTEGER NOT NULL DEFAULT 5, next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), lease_expires_at TIMESTAMPTZ,
 last_error TEXT, receipt JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE(tenant_id, provider, idempotency_key)
);
CREATE TABLE IF NOT EXISTS support_evaluations (
 id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, suite_version TEXT NOT NULL, fixture_version TEXT NOT NULL, metrics JSONB NOT NULL,
 limits JSONB NOT NULL, accepted BOOLEAN NOT NULL, failures JSONB NOT NULL, result_hash CHAR(64) NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS support_cases_tenant_idx ON support_cases(tenant_id,id);
CREATE INDEX IF NOT EXISTS support_deliveries_dispatch_idx ON support_deliveries(tenant_id,status,next_attempt_at);
CREATE TABLE IF NOT EXISTS support_audit (
 id BIGSERIAL PRIMARY KEY, tenant_id TEXT NOT NULL, customer_id TEXT, actor_id TEXT NOT NULL, actor_role TEXT NOT NULL,
 action TEXT NOT NULL, resource_type TEXT NOT NULL, resource_id TEXT NOT NULL, before_hash CHAR(64), after_hash CHAR(64),
 metadata JSONB NOT NULL DEFAULT '{}'::jsonb, occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE OR REPLACE FUNCTION support_audit_immutable() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'support_audit is append-only'; END; $$;
DROP TRIGGER IF EXISTS support_audit_no_update ON support_audit;
CREATE TRIGGER support_audit_no_update BEFORE UPDATE OR DELETE ON support_audit FOR EACH ROW EXECUTE FUNCTION support_audit_immutable();
