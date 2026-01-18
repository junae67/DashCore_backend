/**
 * Script para configurar Business Central con SOLO el módulo salesInvoices
 * Ejecutar: node scripts/setupBCSalesInvoicesOnly.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setupBCSalesInvoicesOnly() {
  try {
    console.log('🚀 Configurando Business Central con SOLO salesInvoices...\n');

    // 1. Buscar la compañía de Business Central
    const company = await prisma.company.findFirst({
      where: {
        erp: { name: 'businesscentral' }
      },
      include: { erp: true }
    });

    if (!company) {
      console.log('❌ No se encontró ninguna compañía de Business Central');
      console.log('   Primero autentícate con BC para crear una compañía');
      return;
    }

    console.log(`✅ Compañía encontrada: ${company.name} (${company.email})`);

    // 2. Buscar o crear ERPConfig
    let erpConfig = await prisma.eRPConfig.findFirst({
      where: {
        companyId: company.id,
        erpType: 'businesscentral'
      }
    });

    if (!erpConfig) {
      erpConfig = await prisma.eRPConfig.create({
        data: {
          companyId: company.id,
          erpType: 'businesscentral',
          isActive: true,
          customSettings: {
            apiBaseUrl: 'https://api-bc.dashcore.app',
            description: 'Business Central - Solo Facturas'
          }
        }
      });
      console.log(`✅ ERPConfig creado: ${erpConfig.id}`);
    } else {
      console.log(`✅ ERPConfig existente: ${erpConfig.id}`);
    }

    // 3. Eliminar módulos existentes
    await prisma.moduleConfig.deleteMany({
      where: { erpConfigId: erpConfig.id }
    });
    console.log('🗑️  Módulos anteriores eliminados');

    // 4. Crear SOLO el módulo salesInvoices
    await prisma.moduleConfig.create({
      data: {
        erpConfigId: erpConfig.id,
        moduleType: 'salesInvoices',
        displayName: 'Facturas de Venta',
        endpoint: 'salesInvoices',
        isEnabled: true,
        sortOrder: 1,
        fieldMappings: {
          invoiceid: 'No_',
          customername: 'Sell_to_Customer_Name',
          totalamount: 'Amount',
          createdon: 'Posting_Date',
          status: 'Status',
          duedate: 'Due_Date'
        },
        filters: {}
      }
    });
    console.log('✅ Módulo salesInvoices creado');

    // 5. Mostrar resumen
    console.log('\n🎉 Configuración completada!\n');
    console.log('─'.repeat(50));
    console.log('\n📊 Módulos habilitados para Business Central:');

    const allModules = await prisma.moduleConfig.findMany({
      where: { erpConfigId: erpConfig.id },
      orderBy: { sortOrder: 'asc' }
    });

    for (const m of allModules) {
      console.log(`\n  📁 ${m.moduleType}`);
      console.log(`     Nombre: ${m.displayName}`);
      console.log(`     Endpoint: /api/${m.endpoint}`);
      console.log(`     Habilitado: ${m.isEnabled ? 'Sí' : 'No'}`);
    }

    console.log('\n' + '─'.repeat(50));
    console.log('\n✨ Ahora al entrar a BC solo verás el módulo "Facturas de Venta"');
    console.log('   Reinicia el frontend y backend para ver los cambios\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupBCSalesInvoicesOnly();
