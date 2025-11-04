// Script para crear el ERP Business Central en la base de datos
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createBusinessCentralERP() {
  try {
    console.log('🚀 Creando ERP Business Central en la base de datos...\n');

    // Verificar si ya existe
    const existing = await prisma.erp.findUnique({
      where: { name: 'businesscentral' },
    });

    if (existing) {
      console.log('ℹ️  Business Central ya existe en la base de datos');
      console.log('   ID:', existing.id);
      console.log('   Name:', existing.name);
      console.log('   Description:', existing.description);
      return existing;
    }

    // Crear nuevo ERP
    const businesscentral = await prisma.erp.create({
      data: {
        name: 'businesscentral',
        description: 'Microsoft Dynamics 365 Business Central',
      },
    });

    console.log('✅ Business Central creado exitosamente!');
    console.log('   ID:', businesscentral.id);
    console.log('   Name:', businesscentral.name);
    console.log('   Description:', businesscentral.description);

    // Crear una compañía demo para Business Central
    const demoCompany = await prisma.company.upsert({
      where: { email: 'admin@businesscentral.local' },
      update: {
        name: 'Business Central Demo',
        erpId: businesscentral.id,
      },
      create: {
        name: 'Business Central Demo',
        email: 'admin@businesscentral.local',
        erpId: businesscentral.id,
      },
    });

    console.log('\n✅ Compañía demo creada!');
    console.log('   ID:', demoCompany.id);
    console.log('   Name:', demoCompany.name);
    console.log('   Email:', demoCompany.email);

    console.log('\n🎉 Business Central configurado y listo para usar!');
    console.log('\n📋 Resumen de ERPs disponibles:');

    const allErps = await prisma.erp.findMany({
      include: {
        _count: {
          select: { companies: true },
        },
      },
    });

    allErps.forEach((erp) => {
      console.log(`   • ${erp.description} (${erp.name}) - ${erp._count.companies} compañías`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

createBusinessCentralERP();
