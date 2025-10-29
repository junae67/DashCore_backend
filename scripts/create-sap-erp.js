// scripts/create-sap-erp.js
// Script para crear el registro de SAP en la base de datos

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createSAPERP() {
  try {
    console.log('🌱 Creando ERP de SAP...');

    // Verificar si SAP ya existe
    const existingSAP = await prisma.erp.findUnique({
      where: { name: 'sap' },
    });

    if (existingSAP) {
      console.log('✅ SAP ya existe en la base de datos:', existingSAP);
      return;
    }

    // Crear SAP
    const sap = await prisma.erp.create({
      data: {
        name: 'sap',
        description: 'SAP S/4HANA Cloud',
      },
    });

    console.log('🎉 ERP SAP creado exitosamente:', sap);

    // Verificar Dynamics también
    const dynamics = await prisma.erp.findUnique({
      where: { name: 'dynamics365' },
    });

    if (!dynamics) {
      console.log('⚠️ Creando también Dynamics 365...');
      await prisma.erp.create({
        data: {
          name: 'dynamics365',
          description: 'Microsoft Dynamics 365',
        },
      });
      console.log('✅ Dynamics 365 creado');
    }

    // Mostrar todos los ERPs
    const allErps = await prisma.erp.findMany();
    console.log('\n📊 ERPs disponibles en la base de datos:');
    allErps.forEach((erp) => {
      console.log(`  - ${erp.name}: ${erp.description}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createSAPERP();
