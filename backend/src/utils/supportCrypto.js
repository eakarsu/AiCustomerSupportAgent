import crypto from 'crypto';

function key() {
  const decoded = Buffer.from(process.env.SUPPORT_DATA_KEY || '', 'base64');
  if (decoded.length !== 32) throw new Error('SUPPORT_DATA_KEY_must_decode_to_32_bytes');
  return decoded;
}

export function encrypt(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const ciphertext = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()]);
  return { ciphertext, iv, authTag: cipher.getAuthTag() };
}

export function decrypt(ciphertext, iv, authTag) {
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
