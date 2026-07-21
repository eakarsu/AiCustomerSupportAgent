import express from 'express';
import crypto from 'crypto';
import {hash} from '../domain/supportWorkflow.js';
import {configs} from '../providers/supportProviders.js';

const router = express.Router();

export function validSignature(tenantId, rawBody, signature) {
  const expected = crypto.createHmac('sha256', process.env.SUPPORT_WEBHOOK_SECRET).update(`${tenantId}.`).update(rawBody).digest('hex');
  return typeof signature === 'string' && /^[a-f0-9]{64}$/i.test(signature) && crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
}

router.post('/:provider', async (req, res, next) => {
  try {
    if (!configs[req.params.provider]) throw new Error('unsupported_provider');
    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId || typeof tenantId !== 'string') throw new Error('tenant_id_required');
    const signature = req.headers['x-signature'];
    if (!validSignature(tenantId, req.rawBody, signature)) {
      return res.status(401).json({ error: 'invalid_signature' });
    }
    const event = req.body || {};
    if (!event.eventId || !event.idempotencyKey || !event.payloadHash || !event.providerRequestId || !['confirmed', 'failed'].includes(event.status)) {
      throw new Error('invalid_provider_event');
    }
    const result = await req.prisma.$transaction(async tx => {
      const inserted = await tx.$queryRawUnsafe(
        'INSERT INTO support_webhook_receipts(id,tenant_id,provider,provider_event_id,payload_hash) VALUES($1,$2,$3,$4,$5) ON CONFLICT(tenant_id,provider,provider_event_id) DO NOTHING RETURNING id',
        crypto.randomUUID(), tenantId, req.params.provider, String(event.eventId), hash(event)
      );
      if (!inserted.length) return { duplicate: true };
      const deliveries = await tx.$queryRawUnsafe(
        'SELECT * FROM support_deliveries WHERE tenant_id=$1 AND provider=$2 AND idempotency_key=$3 FOR UPDATE',
        tenantId, req.params.provider, String(event.idempotencyKey)
      );
      if (!deliveries.length) throw new Error('delivery_not_found');
      const delivery = deliveries[0];
      if (delivery.payload_hash !== event.payloadHash) throw new Error('provider_payload_hash_mismatch');
      if (event.status === 'confirmed') {
        await tx.$executeRawUnsafe(
          "UPDATE support_deliveries SET status='confirmed',receipt=$1::jsonb,lease_expires_at=NULL,updated_at=NOW() WHERE id=$2",
          JSON.stringify({ providerRequestId: event.providerRequestId, payloadHash: event.payloadHash, eventId: event.eventId }), delivery.id
        );
      } else {
        await tx.$executeRawUnsafe(
          "UPDATE support_deliveries SET attempts=attempts+1,status=CASE WHEN attempts+1>=max_attempts THEN 'dead_letter' ELSE 'retrying' END,next_attempt_at=NOW()+(POWER(2,LEAST(attempts,8))||' seconds')::interval,lease_expires_at=NULL,last_error=$1,updated_at=NOW() WHERE id=$2",
          String(event.error || 'provider_failed'), delivery.id
        );
      }
      await tx.$executeRawUnsafe('UPDATE support_webhook_receipts SET processed_at=NOW() WHERE tenant_id=$1 AND provider=$2 AND provider_event_id=$3', tenantId, req.params.provider, String(event.eventId));
      return { duplicate: false, deliveryId: delivery.id, status: event.status };
    });
    res.status(202).json({ accepted: true, ...result });
  } catch (error) { next(error); }
});

export default router;
