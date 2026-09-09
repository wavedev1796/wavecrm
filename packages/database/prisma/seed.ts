import { PrismaClient, UserRole } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const owner = await prisma.user.upsert({
    where: { email: 'eduardo@thewavesea.com' },
    update: {},
    create: {
      email: 'eduardo@thewavesea.com',
      name: 'Eduardo García',
      role: UserRole.ADMIN,
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

  const existingDeal = await prisma.deal.findFirst({ where: { title: 'Renovación Comercial Andina' } });
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

