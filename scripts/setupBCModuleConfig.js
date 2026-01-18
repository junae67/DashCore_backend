// Script para configurar ModuleConfig de Business Central
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setupBCConfig() {
  try {
    // 1. Buscar el ERPConfig de Business Central
    const erpConfig = await prisma.eRPConfig.findFirst({
      where: { erpType: 'businesscentral' }
    });

    if (!erpConfig) {
      console.log('No se encontró ERPConfig para Business Central');
      console.log('Primero crea un ERPConfig en Prisma Studio');
      return;
    }

    console.log('ERPConfig encontrado:', erpConfig.id);

    // 2. Configuración de módulos para BC
    const modulesConfig = [
      {
        moduleType: 'leads',
        displayName: 'Órdenes de Venta',
        endpoint: 'salesOrders',
        isEnabled: true,
        sortOrder: 1,
        fieldMappings: {
          leadid: 'No_',
          fullname: 'Sell_to_Customer_Name',
          companyname: 'Sell_to_Customer_Name',
          emailaddress1: 'Sell_to_E_Mail',
          estimatedvalue: 'Amount',
          createdon: 'Order_Date',
          statuscode: 'Status'
        }
      },
      {
        moduleType: 'contacts',
        displayName: 'Clientes',
        endpoint: 'customers',
        isEnabled: true,
        sortOrder: 2,
        fieldMappings: {
          contactid: 'No_',
          fullname: 'Name',
          emailaddress1: 'E_Mail',
          telephone1: 'Phone_No',
          address1_city: 'City',
          address1_country: 'Country_Region_Code'
        }
      },
      {
        moduleType: 'finance',
        displayName: 'Facturas',
        endpoint: 'salesInvoices',
        isEnabled: true,
        sortOrder: 3,
        fieldMappings: {
          invoiceid: 'No_',
          customername: 'Sell_to_Customer_Name',
          totalamount: 'Amount',
          createdon: 'Posting_Date',
          status: 'Status'
        }
      }
    ];

    // 3. Crear o actualizar cada ModuleConfig
    for (const config of modulesConfig) {
      const existing = await prisma.moduleConfig.findFirst({
        where: {
          erpConfigId: erpConfig.id,
          moduleType: config.moduleType
        }
      });

      if (existing) {
        // Actualizar existente
        await prisma.moduleConfig.update({
          where: { id: existing.id },
          data: {
            displayName: config.displayName,
            endpoint: config.endpoint,
            isEnabled: config.isEnabled,
            sortOrder: config.sortOrder,
            fieldMappings: config.fieldMappings
          }
        });
        console.log(`✅ Actualizado: ${config.moduleType}`);
      } else {
        // Crear nuevo
        await prisma.moduleConfig.create({
          data: {
            erpConfigId: erpConfig.id,
            moduleType: config.moduleType,
            displayName: config.displayName,
            endpoint: config.endpoint,
            isEnabled: config.isEnabled,
            sortOrder: config.sortOrder,
            fieldMappings: config.fieldMappings
          }
        });
        console.log(`✅ Creado: ${config.moduleType}`);
      }
    }

    console.log('\n🎉 Configuración de BC completada!');

    // Mostrar resultado
    const allConfigs = await prisma.moduleConfig.findMany({
      where: { erpConfigId: erpConfig.id }
    });
    console.log('\nMódulos configurados:');
    allConfigs.forEach(m => {
      console.log(`  - ${m.moduleType}: ${m.displayName} (${m.endpoint})`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupBCConfig();
