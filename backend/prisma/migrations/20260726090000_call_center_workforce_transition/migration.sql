CREATE TABLE IF NOT EXISTS support_workforce_transitions (
  id BIGSERIAL PRIMARY KEY,tenant_id TEXT,transition_ref TEXT NOT NULL UNIQUE,team_name TEXT NOT NULL,
  current_queue TEXT NOT NULL,automation_coverage_pct NUMERIC(5,2) NOT NULL,complexity_retained_pct NUMERIC(5,2) NOT NULL,
  people_impacted INTEGER NOT NULL,target_role TEXT NOT NULL,required_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
  training_progress_pct NUMERIC(5,2) NOT NULL,service_quality_before NUMERIC(5,2) NOT NULL,service_quality_after NUMERIC(5,2),
  redeployment_status TEXT NOT NULL CHECK(redeployment_status IN('assess','training','shadowing','certified','redeployed')),
  accountable_owner TEXT NOT NULL,human_service_guardrail TEXT NOT NULL,updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
INSERT INTO support_workforce_transitions(transition_ref,team_name,current_queue,automation_coverage_pct,complexity_retained_pct,people_impacted,target_role,required_skills,training_progress_pct,service_quality_before,service_quality_after,redeployment_status,accountable_owner,human_service_guardrail)
SELECT 'WFT-'||LPAD(g::text,3,'0'),
 (ARRAY['Billing Support','Technical Support','Member Services','Returns Operations','Account Services'])[((g-1)%5)+1]||' · Team '||CEIL(g/5.0)::int,
 (ARRAY['Billing questions','Password and access','Benefits inquiries','Return eligibility','Account changes'])[((g-1)%5)+1],
 35+(g%8)*6,45+(g%6)*7,5+(g%9),
 (ARRAY['Escalation specialist','AI quality analyst','Customer success advisor','Knowledge operations lead','Automation supervisor'])[((g-1)%5)+1],
 jsonb_build_array('AI output evaluation','customer empathy','exception handling','evidence documentation'),
 20+(g%9)*9,78+(g%7)*2,CASE WHEN g%4=0 THEN NULL ELSE 82+(g%6)*2 END,
 (ARRAY['assess','training','shadowing','certified','redeployed'])[((g-1)%5)+1],
 (ARRAY['Avery · Support Ops','Morgan · Enablement','Riley · Quality'])[((g-1)%3)+1],
 'High-empathy, vulnerable-customer, complaint, and consequential cases remain human-owned.'
FROM generate_series(1,15) g ON CONFLICT(transition_ref) DO NOTHING;
