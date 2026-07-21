# Completeness Review: AiCustomerSupportAgent

- **Review date:** 2026-07-18
- **Assessment basis:** Static source and configuration inspection only. Dependencies were not installed, and no build, database migration, external integration, or runtime workflow was executed.

## Classification

**Functional but incomplete**

## Verdict

This is a substantive but unfinished domain application application: 120 project-owned source files and 2 manifest(s) expose a coherent surface, but the source does not demonstrate a production-complete Ai Customer Support Agent workflow.

## Why it is not complete

- 14 files are explicitly named as gap/backlog surfaces, so page and route counts overstate implemented product capability.
- 35 project-owned files contain direct provider/chat-completion markers; generic model calls are not a substitute for typed domain tools, grounded evidence, deterministic rules, or evaluations.
- 42 files contain mock, sample, placeholder, simulated, or random-data signals, leaving important outcomes disconnected from authoritative systems.
- No recognizable project-owned automated tests were found for the primary workflow.
- No checked-in CI workflow was found to continuously verify builds, tests, migrations, and security checks.

## Needed features

1. Implement the Customer Support Agent primary workflow as an explicit state machine with validated inputs, durable ownership/status transitions, approvals, and failure recovery.
2. Connect the authoritative systems of record and external execution providers through typed adapters, idempotency, retries, reconciliation, and webhooks.
3. Define measurable acceptance criteria and validate correctness, edge cases, failure paths, latency, and real-world outcomes on versioned fixtures.
4. Add secure identity, role/tenant boundaries, audit history, consent/privacy controls, safe configuration, and human approval for consequential actions.
5. Replace the generated “calls voice lack analyze call sentiment or extract call tran” gap surface with durable domain state, real integration behavior, explicit failure handling, and acceptance tests.
6. Add contract, integration, authorization, migration, failure-path, and end-to-end tests in CI, plus a documented nondestructive deployment/run path.

## Risks or launch blockers

- Generated routes and seeded records can make the application look broader than its real execution capability.
- Unvalidated model output and weak operational controls can turn a demo path into an unsafe action.
- A weak JWT/session-secret fallback can make authentication forgeable when configuration is absent.
- The root launcher can terminate unrelated processes occupying configured ports.
- The root launcher seeds, creates, migrates, or otherwise mutates database state during startup.
- The root launcher installs dependencies at run time, reducing reproducibility and expanding supply-chain risk.

## Evidence inspected

- `README.md` — inspected project-owned structure or implementation evidence.
- `backend/package.json` — inspected project-owned structure or implementation evidence.
- `backend/src/index.js` — inspected project-owned structure or implementation evidence.
- `backend/src/routes/gap_calls_voice_lack_analyze_call_sentiment_or_extract_call_tran.js` — inspected project-owned structure or implementation evidence.
- `start.sh` — inspected project-owned structure or implementation evidence.
- `backend/prisma/schema.prisma` — inspected project-owned structure or implementation evidence.

## Recommended next action

Choose one production domain application journey, connect its authoritative systems, define measurable acceptance tests, and close its data, permission, failure, and operational gaps before adding screens.

## Implementation progress (2026-07-19)

1. **Primary workflow:** implemented validated, tenant-scoped cases with encrypted content, explicit assignment/draft/review/approval/send/wait/resolve/escalate/recovery transitions, server-validated owners, independent approval, provider-receipt gating, atomic state updates, recoverable delivery leases, retries, and dead letters in `backend/src/domain/supportWorkflow.js`, `backend/src/routes/authoritative.js`, and `backend/prisma/migrations/202607180001_authoritative_support/migration.sql`.
2. **Systems of record and execution:** added operation-limited email, SMS, voice, chat, Salesforce, and HubSpot adapters with payload-bound idempotency/receipts and timeouts. Public HMAC webhooks bind tenant plus exact raw body, deduplicate events, reconcile delivery payload hashes, and persist confirmation/failure in `backend/src/providers/supportProviders.js` and `backend/src/routes/supportWebhooks.js`. Live execution remains blocked until provider/CRM accounts, credentials, webhook registrations, and reconciliation mappings are provisioned.
3. **Acceptance criteria:** added fail-closed correctness, edge-case, mandatory-escalation, latency, resolution-outcome, and group-delta gates with server-owned limits. `backend/test/fixtures/support-evaluation.v1.json` is a versioned corpus exercised in `backend/test/supportWorkflow.test.js`; representative production conversations, outcome labels, service-level targets, and fairness cohorts still require owner calibration.
4. **Identity, privacy, and approval:** authentication reloads role/tenant/customer subject from durable identity rather than trusting token role claims; case bodies and call transcripts use AES-256-GCM; consent and retention are validated; withdrawal purges local sensitive text, stops work, and queues supported provider deletion; audits are append-only; consequential replies and call-analysis dispositions require independent supervisors. Production key custody, privacy/legal approval, retention schedules, deletion-receipt operations, and staff provisioning remain external.
5. **Voice gap replacement:** legacy/generated voice/AI endpoints are quarantined. The authoritative route now requires dual recording/analysis consent, recording checksum, timestamped transcript, model version, confirmed voice-provider receipt, encrypted transcript state, advisory labeling, and a recorded supervisor disposition, with explicit failure behavior and acceptance tests.
6. **Tests and operations:** added domain, authorization, webhook-signature, provider integration/failure, architecture/contract, versioned-fixture, Prisma migration, launch-readiness, frontend-build, and production-dependency audit checks in `.github/workflows/authoritative.yml`; `start.sh`, `.env.example`, and `RUNBOOK.md` define a nondestructive lockfile run path. Local validation passed 22 Node tests, syntax checks, Prisma validation/client generation, zero-vulnerability production dependency audits, and the Vite production build. A local isolated migration smoke was attempted but Docker was unavailable; the same fresh-PostgreSQL migration/readiness smoke is configured in CI and no owner database was touched.

**Ledger readiness:** ready to ledger as source-complete for the reviewed requirements, with live provider/CRM infrastructure, production evaluation data, privacy/key governance, staff provisioning, and deletion/reconciliation operations explicitly recorded as external launch blockers.

## Runtime verification (2026-07-20)

The isolated runtime campaign used PostgreSQL `55603`, API `6020`, and UI `6021`, retaining all five attempts in the shard result log. Four failed attempts exposed missing test-safe webhook/encryption configuration, symlink-aware ESM entry-point detection, Prisma `regclass` deserialization, and discovery of the authoritative SQL migration. After those repairs, `start.sh` completed without error and the validator recorded `API_VERIFIED/startup_login_session_api` at `2026-07-20T19:38:18Z`. Login used the normalized PostgreSQL/Prisma user and `/api/auth/me` reloaded the durable user/tenant identity. All 22 backend tests, Prisma schema validation, shell/JavaScript syntax checks, and the Vite production build passed. The isolated PostgreSQL and application listeners were released after verification.
