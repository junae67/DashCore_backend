// scripts/delete-soft-mas-sap.js
// Script para eliminar la company duplicada soft-mas-sap

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteSoftMasSAP() {
  try {
    console.log('🗑️ Eliminando company "soft-mas-sap"...');

    const result = await prisma.company.deleteMany({
      where: {
        name: 'soft-mas-sap',
      },
    });

    console.log(`✅ ${result.count} company eliminada`);

    // Mostrar companies restantes
    const companies = await prisma.company.findMany({
      include: { erp: true },
    });

    console.log('\n📊 Companies actuales:');
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

deleteSoftMasSAP();
