import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

process.env.SUPPORT_WEBHOOK_SECRET='test-only-webhook-secret-at-least-thirty-two-characters';
const {validSignature}=await import('../src/routes/supportWebhooks.js');

test('webhook signature binds the tenant and exact request body',()=>{
  const body=Buffer.from('{"eventId":"event-1"}');
  const signature=crypto.createHmac('sha256',process.env.SUPPORT_WEBHOOK_SECRET).update('tenant-a.').update(body).digest('hex');
  assert.equal(validSignature('tenant-a',body,signature),true);
  assert.equal(validSignature('tenant-b',body,signature),false);
  assert.equal(validSignature('tenant-a',Buffer.from('{}'),signature),false);
});

test('webhook signature rejects malformed hex without throwing',()=>assert.equal(validSignature('tenant-a',Buffer.from('{}'),'not-hex'),false));
