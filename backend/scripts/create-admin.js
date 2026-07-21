import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

export async function main(env = process.env, prisma = new PrismaClient()) {
  if (env.BOOTSTRAP_ACKNOWLEDGEMENT !== 'create-initial-admin') {
    throw new Error('BOOTSTRAP_ACKNOWLEDGEMENT=create-initial-admin is required');
  }
  const email = String(env.PROVISION_ADMIN_EMAIL || env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(env.PROVISION_ADMIN_PASSWORD || env.ADMIN_PASSWORD || '');
  const name = String(env.PROVISION_ADMIN_NAME || env.BOOTSTRAP_ADMIN_NAME || 'Support Administrator').trim();
  const tenantId = String(env.TENANT_ID || env.GOVERNANCE_TENANT_ID || '').trim();
  if (!email.includes('@') || password.length < 12 || !name || !tenantId) {
    throw new Error('A valid email, 12-character password, name, and tenant are required');
  }
  try {
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    const id = existing?.id;
    await prisma.user.upsert({
      where: { email },
      create: {
        email,
        password: await bcrypt.hash(password, 12),
        name,
        role: 'admin',
        tenantId,
        subjectId: id || undefined,
        isActive: true,
      },
      update: {
        password: await bcrypt.hash(password, 12),
        name,
        role: 'admin',
        tenantId,
        isActive: true,
      },
    });
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, subjectId: true } });
    if (user && !user.subjectId) await prisma.user.update({ where: { id: user.id }, data: { subjectId: user.id } });
    console.log(`Provisioned support administrator ${email}`);
  } finally {
    await prisma.$disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => { console.error(error.message); process.exitCode = 1; });
}
