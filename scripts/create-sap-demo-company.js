// scripts/create-sap-demo-company.js
// Script para crear una company demo para SAP (para pruebas)

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createSAPDemoCompany() {
  try {
    console.log('🌱 Creando company demo para SAP...');

    // Buscar ERP de SAP
    const sap = await prisma.erp.findUnique({
      where: { name: 'sap' },
    });

    if (!sap) {
      console.error('❌ ERP SAP no encontrado. Ejecuta create-sap-erp.js primero');
      process.exit(1);
    }

    // Crear company demo para SAP
    const sapCompany = await prisma.company.upsert({
      where: { email: 'demo@sap-trial.com' },
      update: {
        name: 'SAP Trial Demo',
        erpId: sap.id,
      },
      create: {
        name: 'SAP Trial Demo',
        email: 'demo@sap-trial.com',
        erpId: sap.id,
      },
    });

    console.log('✅ Company demo creada para SAP:', sapCompany);

    // Mostrar resumen
    const companies = await prisma.company.findMany({
      include: { erp: true },
    });

    console.log('\n📊 Companies disponibles:');
    companies.forEach((company) => {
      console.log(`  - ${company.name} (${company.email}) → ${company.erp.name}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createSAPDemoCompany();
