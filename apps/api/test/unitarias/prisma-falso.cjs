// Prisma en memoria para las unitarias de contactos y empresas: un modelo que
// siempre devuelve `row` (o null) y un auditLog vacío.
function prismaFor(model, row) {
  const prisma = {
    [model]: {
      findMany: async () => [row],
      count: async () => 1,
      findUnique: async () => row,
      create: async ({ data }) => ({ ...row, ...data }),
      update: async ({ data }) => ({ ...row, ...data }),
      delete: async () => row,
    },
    auditLog: {
      findMany: async () => [],
      create: async ({ data }) => data,
    },
  };
  prisma.$transaction = async (operation) =>
    typeof operation === "function"
      ? operation(prisma)
      : Promise.all(operation);
  return prisma;
}

module.exports = { prismaFor };
