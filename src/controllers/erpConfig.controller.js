/**
 * ARCHIVO: controllers/erpConfig.controller.js
 * DESCRIPCIÓN: Controlador para configuración personalizada de ERPs por cliente
 *
 * RESPONSABILIDADES:
 * - Gestionar configuración específica de ERP para cada compañía
 * - Crear configuraciones por defecto según tipo de ERP
 * - Permitir personalización de endpoints, módulos y mapeos de campos
 * - Gestionar habilitación/deshabilitación de módulos
 * - Mantener configuración de filtros y ordenamiento
 *
 * DEPENDENCIAS:
 * - @prisma/client: Para CRUD de ERPConfig y ModuleConfig
 *
 * RELACIONES:
 * - Usado por rutas en erpConfig.routes.js
 * - Requiere identifyCompany middleware para req.companyId
 * - Trabaja con tablas: ERPConfig, ModuleConfig
 * - La configuración es consultada por conectores
 * - Permite personalizar endpoints para cada cliente
 *
 * ENDPOINTS:
 * - GET /api/config/erp/:erpType → getERPConfig()
 * - PUT /api/config/erp/:erpType → updateERPConfig()
 * - GET /api/config/modules → getModules()
 * - PUT /api/config/modules/:moduleId → updateModule()
 *
 * CONFIGURACIONES POR DEFECTO:
 * - dynamics365: opportunities, contacts, salesorders
 * - sap: BusinessPartners, BusinessPartners, Orders
 *
 * FUNCIONALIDAD CLAVE:
 * - Cada cliente puede tener endpoints diferentes para el mismo módulo
 * - Ejemplo: Cliente A usa 'salesQuotes' para leads, Cliente B usa 'salesOrders'
 * - Soporta mapeo de campos personalizados (fieldMappings)
 * - Soporta filtros OData personalizados
 */

// src/controllers/erpConfig.controller.js
// Controlador para gestionar configuración personalizada de ERPs por cliente

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Obtiene la configuración de ERP para un cliente
 * GET /api/config/erp/:erpType
 */
exports.getERPConfig = async (req, res) => {
  try {
    const { erpType } = req.params;
    const { companyId } = req; // Del middleware de autenticación

    console.log(`📋 Obteniendo config de ${erpType} para company ${companyId}`);

    let config = await prisma.eRPConfig.findUnique({
      where: {
        companyId_erpType: {
          companyId,
          erpType,
        },
      },
      include: {
        modules: {
          where: { isEnabled: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    // Si no existe configuración, crear una por defecto
    if (!config) {
      console.log(`⚠️ No existe config para ${erpType}, creando configuración por defecto...`);
      config = await createDefaultConfig(companyId, erpType);
    }

    res.json({
      success: true,
      config,
    });
  } catch (error) {
    console.error('❌ Error al obtener config de ERP:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Crea o actualiza la configuración de ERP para un cliente
 * PUT /api/config/erp/:erpType
 */
exports.updateERPConfig = async (req, res) => {
  try {
    const { erpType } = req.params;
    const { companyId } = req;
    const { isActive, customSettings, modules } = req.body;

    console.log(`✏️ Actualizando config de ${erpType} para company ${companyId}`);

    // Upsert de la configuración principal
    const config = await prisma.eRPConfig.upsert({
      where: {
        companyId_erpType: {
          companyId,
          erpType,
        },
      },
      update: {
        isActive,
        customSettings,
      },
      create: {
        companyId,
        erpType,
        isActive: isActive ?? true,
        customSettings,
      },
    });

    // Actualizar módulos si se proporcionan
    if (modules && Array.isArray(modules)) {
      for (const module of modules) {
        await prisma.moduleConfig.upsert({
          where: {
            erpConfigId_moduleType: {
              erpConfigId: config.id,
              moduleType: module.moduleType,
            },
          },
          update: {
            isEnabled: module.isEnabled ?? true,
            displayName: module.displayName,
            endpoint: module.endpoint,
            fieldMappings: module.fieldMappings,
            filters: module.filters,
            sortOrder: module.sortOrder ?? 0,
          },
          create: {
            erpConfigId: config.id,
            moduleType: module.moduleType,
            isEnabled: module.isEnabled ?? true,
            displayName: module.displayName,
            endpoint: module.endpoint,
            fieldMappings: module.fieldMappings,
            filters: module.filters,
            sortOrder: module.sortOrder ?? 0,
          },
        });
      }
    }

    // Obtener configuración actualizada con módulos
    const updatedConfig = await prisma.eRPConfig.findUnique({
      where: { id: config.id },
      include: {
        modules: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    res.json({
      success: true,
      config: updatedConfig,
    });
  } catch (error) {
    console.error('❌ Error al actualizar config de ERP:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Obtiene todos los módulos habilitados para un cliente
 * GET /api/config/modules
 */
exports.getModules = async (req, res) => {
  try {
    const { companyId } = req;
    const { erpType } = req.query;

    console.log(`📦 Obteniendo módulos para company ${companyId}, ERP: ${erpType || 'todos'}`);

    const where = {
      erpConfig: {
        companyId,
        isActive: true,
        ...(erpType && { erpType }),
      },
      isEnabled: true,
    };

    const modules = await prisma.moduleConfig.findMany({
      where,
      include: {
        erpConfig: {
          select: {
            erpType: true,
          },
        },
      },
      orderBy: [
        { sortOrder: 'asc' },
        { moduleType: 'asc' },
      ],
    });

    res.json({
      success: true,
      modules,
    });
  } catch (error) {
    console.error('❌ Error al obtener módulos:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Actualiza un módulo específico
 * PUT /api/config/modules/:moduleId
 */
exports.updateModule = async (req, res) => {
  try {
    const { moduleId } = req.params;
    const { isEnabled, displayName, endpoint, fieldMappings, filters, sortOrder } = req.body;

    console.log(`✏️ Actualizando módulo ${moduleId}`);

    const module = await prisma.moduleConfig.update({
      where: { id: moduleId },
      data: {
        isEnabled,
        displayName,
        endpoint,
        fieldMappings,
        filters,
        sortOrder,
      },
    });

    res.json({
      success: true,
      module,
    });
  } catch (error) {
    console.error('❌ Error al actualizar módulo:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

// ========== HELPERS ==========

/**
 * Crea configuración por defecto según el tipo de ERP
 */
async function createDefaultConfig(companyId, erpType) {
  const defaultModules = getDefaultModulesForERP(erpType);

  const config = await prisma.eRPConfig.create({
    data: {
      companyId,
      erpType,
      isActive: true,
      modules: {
        create: defaultModules,
      },
    },
    include: {
      modules: {
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  return config;
}

/**
 * Devuelve la configuración de módulos por defecto según el ERP
 */
function getDefaultModulesForERP(erpType) {
  const defaults = {
    dynamics365: [
      {
        moduleType: 'leads',
        isEnabled: true,
        displayName: 'Opportunities',
        endpoint: 'opportunities',
        sortOrder: 1,
      },
      {
        moduleType: 'contacts',
        isEnabled: true,
        displayName: 'Contacts',
        endpoint: 'contacts',
        sortOrder: 2,
      },
      {
        moduleType: 'finance',
        isEnabled: true,
        displayName: 'Sales Orders',
        endpoint: 'salesorders',
        sortOrder: 3,
      },
    ],
    sap: [
      {
        moduleType: 'leads',
        isEnabled: true,
        displayName: 'Business Partners',
        endpoint: 'BusinessPartners',
        sortOrder: 1,
      },
      {
        moduleType: 'contacts',
        isEnabled: true,
        displayName: 'Contacts',
        endpoint: 'BusinessPartners',
        sortOrder: 2,
      },
      {
        moduleType: 'finance',
        isEnabled: true,
        displayName: 'Sales Orders',
        endpoint: 'Orders',
        sortOrder: 3,
      },
    ],
      businesscentral: [  // ← NUEVA SECCIÓN
      {
        moduleType: 'leads',
        isEnabled: true,
        displayName: 'Sales Orders',
        endpoint: 'salesOrders',
        sortOrder: 1,
      },
      {
        moduleType: 'contacts',
        isEnabled: true,
        displayName: 'Customers',
        endpoint: 'customers',
        sortOrder: 2,
      },
      {
        moduleType: 'finance',
        isEnabled: true,
        displayName: 'Sales Invoices',
        endpoint: 'salesInvoices',
        sortOrder: 3,
      },
    ],  
  };

  return defaults[erpType] || defaults.dynamics365;
}

module.exports = exports;
