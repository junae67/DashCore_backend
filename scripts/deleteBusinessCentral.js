/**
 * Script para eliminar completamente Business Central de la base de datos
 * IMPORTANTE: Este script es DESTRUCTIVO. Ejecutar solo si estás seguro.
 *
 * Uso: node scripts/deleteBusinessCentral.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteBusinessCentral() {
  console.log('🗑️  Iniciando eliminación de Business Central...\n');

  try {
    // PASO 1: Buscar el ERP de Business Central
    console.log('📍 PASO 1: Buscando ERP de Business Central...');
    const bcErp = await prisma.erp.findUnique({
      where: { name: 'businesscentral' },
      include: {
        companies: true,
        connectors: true,
        financeData: true
      }
    });

    if (!bcErp) {
      console.log('✅ No se encontró Business Central en la base de datos. Nada que eliminar.');
      return;
    }

    console.log(`   ✓ Encontrado ERP: ${bcErp.name} (ID: ${bcErp.id})`);
    console.log(`   - Compañías asociadas: ${bcErp.companies.length}`);
    console.log(`   - Conectores asociados: ${bcErp.connectors.length}`);
    console.log(`   - Datos financieros: ${bcErp.financeData.length}\n`);

    // PASO 2: Encontrar todas las compañías que usan BC
    console.log('📍 PASO 2: Buscando compañías que usan Business Central...');
    const bcCompanies = await prisma.company.findMany({
      where: { erpId: bcErp.id },
      include: {
        users: true,
        dashboards: true,
        connectors: true,
        erpConfigs: {
          include: {
            modules: true
          }
        }
      }
    });

    console.log(`   ✓ Encontradas ${bcCompanies.length} compañías:`);
    bcCompanies.forEach(company => {
      console.log(`     - ${company.name} (${company.email})`);
      console.log(`       └─ ${company.users.length} usuarios, ${company.dashboards.length} dashboards, ${company.connectors.length} conectores`);
    });
    console.log('');

    // PASO 3: Confirmar eliminación
    console.log('⚠️  SE ELIMINARÁN LOS SIGUIENTES REGISTROS:');

    let totalModules = 0;
    let totalERPConfigs = 0;
    let totalUsers = 0;
    let totalDashboards = 0;

    bcCompanies.forEach(company => {
      totalUsers += company.users.length;
      totalDashboards += company.dashboards.length;
      company.erpConfigs.forEach(config => {
        totalERPConfigs++;
        totalModules += config.modules.length;
      });
    });

    console.log(`   - ${totalModules} ModuleConfig`);
    console.log(`   - ${totalERPConfigs} ERPConfig`);
    console.log(`   - ${bcErp.financeData.length} FinanceData`);
    console.log(`   - ${bcErp.connectors.length} Connector`);
    console.log(`   - ${totalDashboards} Dashboard`);
    console.log(`   - ${totalUsers} User`);
    console.log(`   - ${bcCompanies.length} Company`);
    console.log(`   - 1 Erp (Business Central)\n`);

    // Aquí normalmente pedirías confirmación, pero como es un script automatizado:
    console.log('🚀 Procediendo con la eliminación...\n');

    // PASO 4: Eliminar en orden correcto (respetando foreign keys)

    // 4.1: Eliminar módulos de configuración
    console.log('📍 PASO 4.1: Eliminando ModuleConfig...');
    const deletedModules = await prisma.moduleConfig.deleteMany({
      where: {
        erpConfig: {
          erpType: 'businesscentral'
        }
      }
    });
    console.log(`   ✓ ${deletedModules.count} ModuleConfig eliminados\n`);

    // 4.2: Eliminar configuraciones de ERP
    console.log('📍 PASO 4.2: Eliminando ERPConfig...');
    const deletedERPConfigs = await prisma.eRPConfig.deleteMany({
      where: { erpType: 'businesscentral' }
    });
    console.log(`   ✓ ${deletedERPConfigs.count} ERPConfig eliminados\n`);

    // 4.3: Eliminar datos financieros
    console.log('📍 PASO 4.3: Eliminando FinanceData...');
    const deletedFinance = await prisma.financeData.deleteMany({
      where: { erpId: bcErp.id }
    });
    console.log(`   ✓ ${deletedFinance.count} FinanceData eliminados\n`);

    // 4.4: Eliminar conectores
    console.log('📍 PASO 4.4: Eliminando Connector...');
    const deletedConnectors = await prisma.connector.deleteMany({
      where: { erpId: bcErp.id }
    });
    console.log(`   ✓ ${deletedConnectors.count} Connector eliminados\n`);

    // 4.5: Eliminar dashboards de compañías BC
    console.log('📍 PASO 4.5: Eliminando Dashboard...');
    const deletedDashboards = await prisma.dashboard.deleteMany({
      where: {
        company: {
          erpId: bcErp.id
        }
      }
    });
    console.log(`   ✓ ${deletedDashboards.count} Dashboard eliminados\n`);

    // 4.6: Eliminar usuarios de compañías BC
    console.log('📍 PASO 4.6: Eliminando User...');
    const deletedUsers = await prisma.user.deleteMany({
      where: {
        company: {
          erpId: bcErp.id
        }
      }
    });
    console.log(`   ✓ ${deletedUsers.count} User eliminados\n`);

    // 4.7: Eliminar compañías BC
    console.log('📍 PASO 4.7: Eliminando Company...');
    const deletedCompanies = await prisma.company.deleteMany({
      where: { erpId: bcErp.id }
    });
    console.log(`   ✓ ${deletedCompanies.count} Company eliminadas\n`);

    // 4.8: Eliminar el ERP Business Central
    console.log('📍 PASO 4.8: Eliminando Erp (Business Central)...');
    const deletedErp = await prisma.erp.delete({
      where: { name: 'businesscentral' }
    });
    console.log(`   ✓ Erp "${deletedErp.name}" eliminado\n`);

    // Verificación final
    console.log('📍 VERIFICACIÓN FINAL...');
    const verification = await prisma.erp.findUnique({
      where: { name: 'businesscentral' }
    });

    if (!verification) {
      console.log('✅ ¡ÉXITO! Business Central ha sido eliminado completamente de la base de datos.\n');
    } else {
      console.log('❌ ERROR: Business Central todavía existe en la base de datos.\n');
    }

  } catch (error) {
    console.error('❌ ERROR durante la eliminación:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar el script
deleteBusinessCentral()
  .then(() => {
    console.log('🎉 Script completado exitosamente.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Script falló:', error);
    process.exit(1);
  });
