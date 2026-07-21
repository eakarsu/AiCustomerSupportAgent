import express from 'express';
import crypto from 'crypto';
import {requireScope,validateCase,validateCallAnalysis,transition,delivery,evaluate,hash} from '../domain/supportWorkflow.js';
import {dispatch,providerSupports} from '../providers/supportProviders.js';
import {encrypt,decrypt} from '../utils/supportCrypto.js';

const router=express.Router();
const actor=req=>({tenantId:req.user.tenantId,role:req.user.role,subjectId:req.user.subjectId});
const permit=(req,customer,action)=>requireScope(actor(req),req.user.tenantId,String(customer),action);
const rows=(req,sql,...args)=>req.prisma.$queryRawUnsafe(sql,...args);
const limits=()=>({
  correctness:Number(process.env.SUPPORT_MIN_CORRECTNESS||0.9),
  edgeCaseRecall:Number(process.env.SUPPORT_MIN_EDGE_CASE_RECALL||0.9),
  latencyMs:Number(process.env.SUPPORT_MAX_LATENCY_MS||2000),
  resolutionRate:Number(process.env.SUPPORT_MIN_RESOLUTION_RATE||0.8),
  maxGroupDelta:Number(process.env.SUPPORT_MAX_GROUP_DELTA||0.1)
});

async function audit(tx,req,customerId,action,type,id,before,after,metadata={}){
  await tx.$executeRawUnsafe(
    'INSERT INTO support_audit(tenant_id,customer_id,actor_id,actor_role,action,resource_type,resource_id,before_hash,after_hash,metadata) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)',
    req.user.tenantId,customerId?String(customerId):null,String(req.user.id),req.user.role,action,type,id,before,after,JSON.stringify(metadata)
  );
}

router.post('/cases',async(req,res,next)=>{
  try{
    permit(req,req.body.customerId,req.user.role==='customer'?'reply':'draft');
    const value=validateCase({...req.body,customerId:req.user.role==='customer'?req.user.subjectId:req.body.customerId});
    const encrypted=encrypt(value.body);const id=crypto.randomUUID();
    await req.prisma.$transaction(async tx=>{
      await tx.$executeRawUnsafe(
        "INSERT INTO support_cases(id,tenant_id,customer_id,owner_id,state,channel,subject,body_hash,body_ciphertext,body_iv,body_auth_tag,consent,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,NOW()+($13||' days')::interval)",
        id,req.user.tenantId,value.customerId,value.ownerId,value.state,value.channel,value.subject,value.caseHash,encrypted.ciphertext,encrypted.iv,encrypted.authTag,JSON.stringify(value.consent),value.consent.retentionDays
      );
      await audit(tx,req,value.customerId,'case.created','support_case',id,null,value.caseHash);
    });
    res.status(201).json({id,state:value.state,caseHash:value.caseHash,retentionDays:value.consent.retentionDays});
  }catch(error){next(error);}
});

router.get('/cases/:id',async(req,res,next)=>{
  try{
    const found=await rows(req,'SELECT * FROM support_cases WHERE id=$1 AND tenant_id=$2',req.params.id,req.user.tenantId);
    if(!found.length)return res.status(404).json({error:'case_not_found'});
    const value=found[0];permit(req,value.customer_id,req.user.role==='customer'?'read_self':'read');
    const body=value.body_ciphertext?decrypt(value.body_ciphertext,value.body_iv,value.body_auth_tag):null;
    const {body_ciphertext,body_iv,body_auth_tag,...safe}=value;
    res.json({...safe,body});
  }catch(error){next(error);}
});

router.post('/cases/:id/call-analysis',async(req,res,next)=>{
  try{
    const found=await rows(req,'SELECT * FROM support_cases WHERE id=$1 AND tenant_id=$2 AND expires_at>NOW()',req.params.id,req.user.tenantId);
    if(!found.length)return res.status(404).json({error:'case_not_found'});
    const supportCase=found[0];permit(req,supportCase.customer_id,'draft');
    const analysis=validateCallAnalysis(req.body);
    const receipts=await rows(req,"SELECT 1 FROM support_deliveries WHERE tenant_id=$1 AND case_id=$2 AND provider='voice' AND operation IN ('transcribe','analyze') AND status='confirmed' AND receipt->>'providerRequestId'=$3 AND ($4::text IS NULL OR payload_hash=$4)",req.user.tenantId,supportCase.id,analysis.providerReceiptId,req.body.providerPayloadHash||null);
    if(!receipts.length)throw new Error('confirmed_analysis_receipt_required');
    const encrypted=encrypt(JSON.stringify(analysis.transcript));const id=crypto.randomUUID();
    await req.prisma.$transaction(async tx=>{
      await tx.$executeRawUnsafe(
        'INSERT INTO support_call_analyses(id,tenant_id,case_id,call_id,recording_checksum,transcript_ciphertext,transcript_iv,transcript_auth_tag,transcript_hash,consent_id,model_version,sentiment,label,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13,$14)',
        id,req.user.tenantId,supportCase.id,analysis.callId,analysis.recordingChecksum,encrypted.ciphertext,encrypted.iv,encrypted.authTag,analysis.transcriptHash,analysis.consentId,analysis.modelVersion,JSON.stringify(req.body.sentiment||{}),analysis.label,supportCase.expires_at
      );
      await audit(tx,req,supportCase.customer_id,'call_analysis.created','support_call_analysis',id,null,analysis.transcriptHash,{callId:analysis.callId,providerReceiptId:analysis.providerReceiptId});
    });
    res.status(201).json({id,transcriptHash:analysis.transcriptHash,label:analysis.label});
  }catch(error){next(error);}
});

router.get('/cases/:id/call-analyses',async(req,res,next)=>{
  try{
    const cases=await rows(req,'SELECT customer_id FROM support_cases WHERE id=$1 AND tenant_id=$2',req.params.id,req.user.tenantId);
    if(!cases.length)return res.status(404).json({error:'case_not_found'});
    permit(req,cases[0].customer_id,req.user.role==='customer'?'read_self':'read');
    const analyses=await rows(req,'SELECT * FROM support_call_analyses WHERE case_id=$1 AND tenant_id=$2 AND expires_at>NOW() ORDER BY created_at',req.params.id,req.user.tenantId);
    res.json(analyses.map(item=>{const transcript=item.transcript_ciphertext?JSON.parse(decrypt(item.transcript_ciphertext,item.transcript_iv,item.transcript_auth_tag)):null;const {transcript_ciphertext,transcript_iv,transcript_auth_tag,...safe}=item;return{...safe,transcript};}));
  }catch(error){next(error);}
});

router.post('/call-analyses/:id/review',async(req,res,next)=>{
  try{
    if(!['accepted','corrected','rejected'].includes(req.body.disposition))throw new Error('invalid_review_disposition');
    const result=await req.prisma.$transaction(async tx=>{
      const found=await tx.$queryRawUnsafe('SELECT a.*,c.customer_id FROM support_call_analyses a JOIN support_cases c ON c.id=a.case_id AND c.tenant_id=a.tenant_id WHERE a.id=$1 AND a.tenant_id=$2 FOR UPDATE',req.params.id,req.user.tenantId);
      if(!found.length)return null;const analysis=found[0];permit(req,analysis.customer_id,'approve');
      await tx.$executeRawUnsafe('UPDATE support_call_analyses SET reviewed_by=$1,review_disposition=$2,review_notes=$3,reviewed_at=NOW() WHERE id=$4 AND tenant_id=$5',String(req.user.id),req.body.disposition,req.body.notes||null,analysis.id,req.user.tenantId);
      await audit(tx,req,analysis.customer_id,'call_analysis.reviewed','support_call_analysis',analysis.id,analysis.transcript_hash,hash({transcriptHash:analysis.transcript_hash,disposition:req.body.disposition}),{disposition:req.body.disposition});
      return{id:analysis.id,reviewedBy:String(req.user.id),disposition:req.body.disposition};
    });
    if(!result)return res.status(404).json({error:'call_analysis_not_found'});res.json(result);
  }catch(error){next(error);}
});

router.post('/cases/:id/transition',async(req,res,next)=>{
  try{
    const result=await req.prisma.$transaction(async tx=>{
      const found=await tx.$queryRawUnsafe('SELECT * FROM support_cases WHERE id=$1 AND tenant_id=$2 AND expires_at>NOW() FOR UPDATE',req.params.id,req.user.tenantId);
      if(!found.length)return null;const supportCase=found[0];
      const action=req.body.target==='approved'?'approve':req.body.target==='escalated'?'escalate':req.body.target==='assigned'?'assign':req.body.target==='sent'?'send':'draft';
      permit(req,supportCase.customer_id,action);
      if(req.body.target==='assigned'){
        const owners=await tx.$queryRawUnsafe("SELECT id FROM \"User\" WHERE id=$1 AND \"tenantId\"=$2 AND role IN ('agent','supervisor','admin') AND \"isActive\"=TRUE",String(req.body.ownerId||''),req.user.tenantId);
        if(!owners.length)throw new Error('invalid_case_owner');
      }
      if(req.body.target==='sent'){
        const receipts=await tx.$queryRawUnsafe("SELECT 1 FROM support_deliveries WHERE tenant_id=$1 AND case_id=$2 AND operation='send' AND status='confirmed' AND receipt->>'providerRequestId'=$3",req.user.tenantId,supportCase.id,req.body.providerReceiptId);
        if(!receipts.length)throw new Error('confirmed_provider_receipt_required');
      }
      const approvalId=req.body.target==='approved'?crypto.randomUUID():supportCase.approval_id;
      const target=transition(supportCase.state,req.body.target,{...req.body,consequential:req.body.target==='approved',humanApprovalId:approvalId,approverId:String(req.user.id),authorId:supportCase.draft_author_id,providerReceiptId:req.body.providerReceiptId});
      const draftAuthor=target==='draft_response'?String(req.user.id):supportCase.draft_author_id;
      await tx.$executeRawUnsafe('UPDATE support_cases SET state=$1,owner_id=COALESCE($2,owner_id),approval_id=COALESCE($3,approval_id),draft_author_id=$4,updated_at=NOW() WHERE id=$5 AND tenant_id=$6',target,req.body.ownerId?String(req.body.ownerId):null,approvalId,draftAuthor,supportCase.id,req.user.tenantId);
      await audit(tx,req,supportCase.customer_id,'case.transitioned','support_case',supportCase.id,hash({state:supportCase.state}),hash({state:target}),{from:supportCase.state,to:target,approvalId});
      return{id:supportCase.id,state:target,approvalId};
    });
    if(!result)return res.status(404).json({error:'case_not_found'});res.json(result);
  }catch(error){next(error);}
});

router.post('/cases/:id/deliveries',async(req,res,next)=>{
  try{
    if(!providerSupports(req.body.provider,req.body.operation))throw new Error('unsupported_provider_operation');
    const found=await rows(req,'SELECT * FROM support_cases WHERE id=$1 AND tenant_id=$2 AND expires_at>NOW()',req.params.id,req.user.tenantId);
    if(!found.length)return res.status(404).json({error:'case_not_found'});const supportCase=found[0];
    permit(req,supportCase.customer_id,'send');
    if(req.body.operation==='send'&&supportCase.state!=='approved')throw new Error('case_not_approved');
    if(supportCase.consent?.withdrawnAt)throw new Error('consent_withdrawn');
    const item=delivery(req.body.provider,req.body.operation,req.body.payload,req.body.idempotencyKey);
    const result=await req.prisma.$transaction(async tx=>{
      const inserted=await tx.$queryRawUnsafe('INSERT INTO support_deliveries(id,tenant_id,case_id,provider,operation,idempotency_key,payload_hash,payload) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb) ON CONFLICT(tenant_id,provider,idempotency_key) DO UPDATE SET updated_at=support_deliveries.updated_at RETURNING *',crypto.randomUUID(),req.user.tenantId,supportCase.id,item.provider,item.operation,item.idempotencyKey,item.payloadHash,JSON.stringify(req.body.payload));
      await audit(tx,req,supportCase.customer_id,'delivery.queued','support_delivery',inserted[0].id,null,item.payloadHash,{provider:item.provider,operation:item.operation});return inserted[0];
    });
    res.status(202).json(result);
  }catch(error){next(error);}
});

router.post('/deliveries/:id/attempt',async(req,res,next)=>{
  try{
    if(!['agent','supervisor','admin'].includes(req.user.role))return res.status(403).json({error:'role_scope_denied'});
    const claimed=await rows(req,"UPDATE support_deliveries SET status='leased',lease_expires_at=NOW()+INTERVAL '60 seconds',updated_at=NOW() WHERE id=$1 AND tenant_id=$2 AND ((status IN ('queued','retrying') AND next_attempt_at<=NOW()) OR (status='leased' AND lease_expires_at<NOW())) RETURNING *",req.params.id,req.user.tenantId);
    if(!claimed.length)return res.status(409).json({error:'delivery_not_dispatchable'});const row=claimed[0];
    try{const receipt=await dispatch(row);const updated=await rows(req,"UPDATE support_deliveries SET status='confirmed',receipt=$1::jsonb,attempts=attempts+1,lease_expires_at=NULL,updated_at=NOW() WHERE id=$2 AND tenant_id=$3 RETURNING *",JSON.stringify(receipt),row.id,req.user.tenantId);return res.json(updated[0]);}
    catch(error){const updated=await rows(req,"UPDATE support_deliveries SET attempts=attempts+1,status=CASE WHEN attempts+1>=max_attempts THEN 'dead_letter' ELSE 'retrying' END,next_attempt_at=NOW()+(POWER(2,LEAST(attempts,8))||' seconds')::interval,lease_expires_at=NULL,last_error=$1,updated_at=NOW() WHERE id=$2 AND tenant_id=$3 RETURNING *",error.message,row.id,req.user.tenantId);return res.status(503).json(updated[0]);}
  }catch(error){next(error);}
});

router.post('/cases/:id/consent/withdraw',async(req,res,next)=>{
  try{
    const result=await req.prisma.$transaction(async tx=>{
      const found=await tx.$queryRawUnsafe('SELECT * FROM support_cases WHERE id=$1 AND tenant_id=$2 FOR UPDATE',req.params.id,req.user.tenantId);
      if(!found.length)return null;const supportCase=found[0];
      permit(req,supportCase.customer_id,req.user.role==='customer'?'read_self':'configure');
      const consent={...supportCase.consent,processing:false,withdrawnAt:new Date().toISOString(),withdrawalReason:req.body.reason||null};
      await tx.$executeRawUnsafe("UPDATE support_cases SET state='closed',consent=$1::jsonb,body_ciphertext=NULL,body_iv=NULL,body_auth_tag=NULL,updated_at=NOW() WHERE id=$2 AND tenant_id=$3",JSON.stringify(consent),supportCase.id,req.user.tenantId);
      await tx.$executeRawUnsafe('UPDATE support_call_analyses SET transcript_ciphertext=NULL,transcript_iv=NULL,transcript_auth_tag=NULL WHERE case_id=$1 AND tenant_id=$2',supportCase.id,req.user.tenantId);
      await tx.$executeRawUnsafe("UPDATE support_deliveries SET status='dead_letter',last_error='consent_withdrawn',lease_expires_at=NULL,updated_at=NOW() WHERE case_id=$1 AND tenant_id=$2 AND status IN ('queued','leased','retrying')",supportCase.id,req.user.tenantId);
      const providers=await tx.$queryRawUnsafe("SELECT DISTINCT provider FROM support_deliveries WHERE case_id=$1 AND tenant_id=$2 AND provider IN ('voice','salesforce','hubspot')",supportCase.id,req.user.tenantId);
      for(const {provider} of providers){const item=delivery(provider,'delete',{caseId:supportCase.id},hash({tenantId:req.user.tenantId,caseId:supportCase.id,provider,operation:'delete'}));await tx.$executeRawUnsafe('INSERT INTO support_deliveries(id,tenant_id,case_id,provider,operation,idempotency_key,payload_hash,payload) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb) ON CONFLICT(tenant_id,provider,idempotency_key) DO NOTHING',crypto.randomUUID(),req.user.tenantId,supportCase.id,provider,item.operation,item.idempotencyKey,item.payloadHash,JSON.stringify({caseId:supportCase.id}));}
      await audit(tx,req,supportCase.customer_id,'consent.withdrawn','support_case',supportCase.id,supportCase.body_hash,hash(consent),{deletionProviders:providers.map(item=>item.provider)});
      return{id:supportCase.id,state:'closed',deletionJobs:providers.length};
    });
    if(!result)return res.status(404).json({error:'case_not_found'});res.status(202).json(result);
  }catch(error){next(error);}
});

router.post('/evaluations',async(req,res,next)=>{
  try{
    if(!['supervisor','admin'].includes(req.user.role))return res.status(403).json({error:'role_scope_denied'});
    if(!req.body.suiteVersion||!req.body.fixtureVersion)throw new Error('evaluation_versions_required');
    const evaluationLimits=limits();const outcome=evaluate(req.body.metrics||{},evaluationLimits);const id=crypto.randomUUID();
    await req.prisma.$transaction(async tx=>{await tx.$executeRawUnsafe('INSERT INTO support_evaluations(id,tenant_id,suite_version,fixture_version,metrics,limits,accepted,failures,result_hash) VALUES($1,$2,$3,$4,$5::jsonb,$6::jsonb,$7,$8::jsonb,$9)',id,req.user.tenantId,req.body.suiteVersion,req.body.fixtureVersion,JSON.stringify(req.body.metrics),JSON.stringify(evaluationLimits),outcome.accepted,JSON.stringify(outcome.failures),outcome.resultHash);await audit(tx,req,null,'evaluation.recorded','support_evaluation',id,null,outcome.resultHash,{accepted:outcome.accepted,failures:outcome.failures});});
    res.status(outcome.accepted?201:422).json({id,limits:evaluationLimits,...outcome});
  }catch(error){next(error);}
});

export default router;
