import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Hash argon2id de la contraseña de desarrollo "Wave2026!". Solo para entornos locales.
const DEV_PASSWORD_HASH =
  '$argon2id$v=19$m=65536,p=4,t=3$gZSN4lsGXJohrKkjgCFxHA$GAxXj/pcSVG5RwvO6wBGFOslD2o8XsOGSWHxCTdSUZk';

async function main() {
  const owner = await prisma.user.upsert({
    where: { email: 'eduardo@thewavesea.com' },
    update: { passwordHash: DEV_PASSWORD_HASH, active: true, activatedAt: new Date() },
    create: {
      email: 'eduardo@thewavesea.com',
      name: 'Eduardo García',
      role: 'ADMIN',
      passwordHash: DEV_PASSWORD_HASH,
      activatedAt: new Date(),
    },
  });

  await prisma.user.upsert({
    where: { email: 'vendedor@thewavesea.com' },
    update: { passwordHash: DEV_PASSWORD_HASH, active: true, activatedAt: new Date() },
    create: {
      email: 'vendedor@thewavesea.com',
      name: 'Vendedor Demo',
      role: 'VENDEDOR',
      passwordHash: DEV_PASSWORD_HASH,
      activatedAt: new Date(),
    },
  });

  const pipeline = await prisma.pipeline.upsert({
    where: { id: 'wave-default-pipeline' },
    update: {},
    create: {
      id: 'wave-default-pipeline',
      name: 'Ventas Wave',
      isDefault: true,
      stages: {
        create: [
          { name: 'Contactado', position: 1, probability: 15, color: '#C9C7BC' },
          { name: 'Negociación', position: 2, probability: 45, color: '#E0B15A' },
          { name: 'Propuesta', position: 3, probability: 70, color: '#6F9FD8' },
          { name: 'Ganado', position: 4, probability: 100, color: '#2F6F8F' },
        ],
      },
    },
    include: { stages: true },
  });

  const company = await prisma.company.upsert({
    where: { taxId: '1791234567001' },
    update: {},
    create: {
      name: 'Comercial Andina',
      legalName: 'Comercial Andina S.A.',
      taxId: '1791234567001',
      province: 'Pichincha',
      city: 'Quito',
      ownerId: owner.id,
    },
  });

  const contact = await prisma.contact.upsert({
    where: { documentId: '1712345678' },
    update: {},
    create: {
      firstName: 'María',
      lastName: 'Cordero',
      email: 'maria.cordero@andina.ec',
      documentId: '1712345678',
      province: 'Pichincha',
      tags: ['Cliente', 'Mayorista'],
      companyId: company.id,
      ownerId: owner.id,
    },
  });

  const firstStage = pipeline.stages.find((stage) => stage.position === 1);
  if (!firstStage) throw new Error('No se creó la etapa inicial');

  const existingDeal = await prisma.deal.findFirst({
    where: { title: 'Renovación Comercial Andina' },
  });

  if (!existingDeal) {
    await prisma.deal.create({
      data: {
        title: 'Renovación Comercial Andina',
        value: 4200,
        pipelineId: pipeline.id,
        stageId: firstStage.id,
        companyId: company.id,
        contactId: contact.id,
        ownerId: owner.id,
      },
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

