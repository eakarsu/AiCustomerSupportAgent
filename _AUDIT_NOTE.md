# Audit Apply Notes — AiCustomerSupportAgent

Source: `/Users/erolakarsu/projects/_AUDIT/reports/batch_02.md` (lines 669-718).

The project already has 40+ AI endpoints across `routes/ai.js`,
`routes/aiFeatures.js`, and `routes/aiNew.js`, well above the >15 threshold.

Per apply-pass policy, this pass is **backlog-only**.

## Original audit recommendations

### Existing AI features (audit listed 12; actual is much higher)
chat, generate-response, sentiment, analyze-sentiment, detect-intent,
summarize-ticket, suggest-category, suggest-priority, generate-article,
feedback, history/:sessionId, check-escalation, classify-ticket,
predict-resolution, suggest-knowledge, score-quality, route-escalation,
shopping-chat, ticket-priority-predictor, churn-risk, agent-coaching,
smart-canned-suggester, clv-scoring, faq-builder, translate, closure-predictor,
call-transcript-analyzer, sla-smart-scheduling, etc.

### Missing AI counterparts (audit gaps — partly already covered)
- `calls.js`/`voice.js` lacks `/analyze-call-sentiment` or
  `/extract-call-transcript` (note: `call-transcript-analyzer` exists in
  `aiNew.js`).
- `cannedResponses.js` lacks `/auto-generate-canned-response` (note:
  `smart-canned-suggester` exists).
- `categories.js`/`tags.js` lacks ML-based auto-tagging (note:
  `classify-ticket` and `suggest-category` exist).

### Missing non-AI features
- Live chat widget for website embedding.
- Email integration (inbound/outbound email tickets).
- SMS support integration.
- CRM integration (Salesforce, HubSpot).
- Workflow automation (auto-escalation, auto-close, auto-notify).

### Custom feature suggestions
- Predictive customer churn (already covered by `churn-risk`).
- Customer health scoring.
- Agent performance prediction.
- Proactive support triggers.
- Multi-lingual support automation (already covered by `translate`).

## Implemented in this pass

None. Backlog-only.

## Backlog (prioritized)

### Mechanical, low-risk
1. `/api/ai/auto-tag-ticket` — ML-style multi-label tagging endpoint that
   maps a ticket to a list of taxonomic tags (the existing `suggest-category`
   returns a single category).
2. `/api/ai/extract-call-transcript-action-items` — extract action items from
   a call transcript (the existing analyzer is broader).

### Needs product decision
- Customer health-scoring schema and storage.
- Agent performance prediction inputs (which signals to use).

### Needs credentials / external SDK
- Email (Gmail/IMAP/SES), SMS (Twilio), CRM (Salesforce, HubSpot).
- Live-chat widget delivery (embed JS).

### Too risky / large refactor
- Workflow automation engine that fires on multiple events.

## Apply pass 3 (frontend)

**Action**: LEFT-AS-IS. Frontend already comprehensively wired.

- `frontend/src/services/api.js` exposes `aiApi` (10 fns) and `aiAdvancedApi` (15 fns), covering 40+ backend AI endpoints across `ai.js`, `aiFeatures.js`, `aiNew.js`.
- JWT Bearer auth from `localStorage.token` set by central `fetchApi` wrapper.
- 11 dedicated AI pages plus inline AI in detail pages.
- 503 (no `OPENROUTER_API_KEY`) propagates through `error.error` JSON to toast.

No FE files modified. See `_AUDIT/apply3_logs/ab3_88.md`.

## Apply pass 4 (mechanical backlog)

**Action**: LEFT-AS-IS (already done in earlier passes).

Both mechanical backlog items are already implemented end-to-end:

1. `POST /api/ai/auto-tag-ticket` — `backend/src/routes/aiNew.js:870` with explicit
   503-when-no-key guard at line 877; FE wired in
   `frontend/src/services/api.js:209` (`aiAdvancedApi.autoTagTicket`) and surfaced
   in `frontend/src/pages/AiAdvancedFeatures.jsx:96`.
2. `POST /api/ai/extract-call-transcript-action-items` — `backend/src/routes/aiNew.js:925`
   with 503 guard at line 931; FE wired at `frontend/src/services/api.js:210`
   (`aiAdvancedApi.extractCallTranscriptActionItems`) and surfaced in
   `frontend/src/pages/AiAdvancedFeatures.jsx:120`.

All other backlog items remain deferred (NEEDS-CREDS for Email/SMS/CRM/widget,
NEEDS-PRODUCT-DECISION for health-scoring schema and agent performance signals,
TOO-RISKY for the workflow-automation engine).

No code changed in this pass. See `_AUDIT/apply4_logs/ab3_88.md`.
