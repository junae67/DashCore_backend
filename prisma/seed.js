// prisma/seed.js
// Script para poblar la base de datos con datos iniciales

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed de base de datos...');

  // Crear ERP Dynamics 365
  const dynamics = await prisma.erp.upsert({
    where: { name: 'dynamics365' },
    update: {
      description: 'Microsoft Dynamics 365',
    },
    create: {
      name: 'dynamics365',
      description: 'Microsoft Dynamics 365',
    },
  });
  console.log('✅ ERP Dynamics 365:', dynamics.name);

  // Crear ERP SAP
  const sap = await prisma.erp.upsert({
    where: { name: 'sap' },
    update: {
      description: 'SAP S/4HANA Cloud',
    },
    create: {
      name: 'sap',
      description: 'SAP S/4HANA Cloud',
    },
  });
  console.log('✅ ERP SAP:', sap.name);

  console.log('🎉 Seed completado exitosamente');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
