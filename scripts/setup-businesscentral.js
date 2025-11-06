// scripts/setup-businesscentral.js
// Script para registrar Business Central en la base de datos

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setupBusinessCentral() {
  console.log('🚀 Configurando Business Central en la base de datos...\n');

  try {
    // 1. Crear o actualizar ERP
    console.log('1️⃣ Registrando ERP Business Central...');
    let erp = await prisma.erp.findUnique({
      where: { name: 'businesscentral' }
    });

    if (erp) {
      console.log('   ✅ ERP ya existe, actualizando...');
      erp = await prisma.erp.update({
        where: { name: 'businesscentral' },
        data: {
          description: 'Microsoft Dynamics 365 Business Central'
        }
      });
    } else {
      erp = await prisma.erp.create({
        data: {
          name: 'businesscentral',
          description: 'Microsoft Dynamics 365 Business Central'
        }
      });
      console.log('   ✅ ERP creado exitosamente');
    }

    // 2. Crear o actualizar Company (CRONUS)
    console.log('\n2️⃣ Registrando compañía CRONUS...');
    const companyName = process.env.BC_COMPANY_ID || 'CRONUS USA, Inc.';

    let company = await prisma.company.findFirst({
      where: {
        name: companyName,
        erpId: erp.id
      }
    });

    if (company) {
      console.log('   ✅ Compañía ya existe');
    } else {
      company = await prisma.company.create({
        data: {
          name: companyName,
          email: `admin@${companyName.toLowerCase().replace(/\s/g, '').replace(',', '').replace('.', '')}.com`,
          erpId: erp.id
        }
      });
      console.log('   ✅ Compañía creada exitosamente');
    }

    // 3. Verificar configuración
    console.log('\n3️⃣ Verificando configuración...');
    console.log(`   ERP ID: ${erp.id}`);
    console.log(`   ERP Name: ${erp.name}`);
    console.log(`   Company ID: ${company.id}`);
    console.log(`   Company Name: ${company.name}`);
    console.log(`   API URL: ${process.env.BC_API_URL}`);
    console.log(`   Auth Type: ${process.env.BC_AUTH_TYPE}`);

    // 4. Verificar que aparezca en /api/erp/list
    console.log('\n4️⃣ Probando endpoint /list...');
    const erps = await prisma.erp.findMany({
      include: { companies: true }
    });

    const bcErp = erps.find(e => e.name === 'businesscentral');
    if (bcErp) {
      console.log('   ✅ Business Central aparecerá en /api/erp/list');
      console.log(`   📋 Clientes: ${bcErp.companies.length}`);
      bcErp.companies.forEach((c, i) => {
        console.log(`      ${i + 1}. ${c.name}`);
      });
    } else {
      console.log('   ❌ Business Central NO aparece en la lista');
    }

    console.log('\n🎉 ¡Business Central configurado correctamente!');
    console.log('\n📝 Próximos pasos:');
    console.log('   1. Reiniciar el backend: npm run dev');
    console.log('   2. Verificar en: http://localhost:3000/api/erp/list');
    console.log('   3. Probar autenticación: http://localhost:3000/api/erp/businesscentral/auth');
    console.log('   4. El frontend detectará automáticamente Business Central');

  } catch (error) {
    console.error('\n❌ Error al configurar Business Central:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setupBusinessCentral();
