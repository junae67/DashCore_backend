// controllers/erp.controller.js
// Controller para operaciones de datos de ERPs

const { PrismaClient } = require('@prisma/client');
const { getConnector } = require('../connectors');
const prisma = new PrismaClient();

/**
 * GET /api/erp/list
 * Obtiene la lista de ERPs disponibles con sus clientes
 */
exports.listErpsWithClients = async (req, res) => {
  try {
    const erps = await prisma.erp.findMany({
      include: {
        companies: true,
      },
    });

    const result = erps.map((erp) => ({
      id: erp.name,
      name: erp.description || erp.name,
      clients: erp.companies.map((company) => ({
        id: company.name.toLowerCase(),
        name: company.name,
      })),
    }));

    res.json(result);
  } catch (error) {
    console.error('❌ Error al obtener ERPs y clientes:', error);
    res.status(500).json({ error: 'Error al obtener datos de ERPs' });
  }
};

/**
 * GET /api/erp/:erpType/leads
 * Obtiene leads desde el ERP especificado
 */
exports.getLeads = async (req, res) => {
  const { erpType } = req.params;

  try {
    const connector = getConnector(erpType);
    const dbConnector = req.connector; // Viene del authMiddleware
    const companyId = req.companyId; // ID de la empresa del middleware

    console.log(`📊 Obteniendo leads de ${erpType} para company ${companyId}`);

    // Pasar companyId al connector para configuración personalizada
    const leads = await connector.getLeads(dbConnector.accessToken, companyId);

    console.log(`✅ ${leads.length} leads obtenidos de ${erpType}`);
    res.json(leads);
  } catch (error) {
    console.error(`❌ Error al obtener leads de ${erpType}:`, error.message);
    res.status(500).json({ error: `Error al obtener leads: ${error.message}` });
  }
};

/**
 * GET /api/erp/:erpType/contacts
 * Obtiene contactos desde el ERP especificado
 */
exports.getContacts = async (req, res) => {
  const { erpType } = req.params;

  try {
    const connector = getConnector(erpType);
    const dbConnector = req.connector;
    const companyId = req.companyId; // ID de la empresa del middleware

    console.log(`📊 Obteniendo contactos de ${erpType} para company ${companyId}`);

    // Pasar companyId al connector para configuración personalizada
    const contacts = await connector.getContacts(dbConnector.accessToken, companyId);

    console.log(`✅ ${contacts.length} contactos obtenidos de ${erpType}`);
    res.json(contacts);
  } catch (error) {
    console.error(`❌ Error al obtener contactos de ${erpType}:`, error.message);
    res.status(500).json({ error: `Error al obtener contactos: ${error.message}` });
  }
};

/**
 * GET /api/erp/:erpType/finance
 * Obtiene datos financieros desde el ERP especificado
 */
exports.getFinanceData = async (req, res) => {
  const { erpType } = req.params;

  try {
    const connector = getConnector(erpType);
    const dbConnector = req.connector;
    const companyId = req.companyId; // ID de la empresa del middleware

    console.log(`📊 Obteniendo datos financieros de ${erpType} para company ${companyId}`);

    // Pasar companyId al connector para configuración personalizada
    const financeData = await connector.getFinanceData(dbConnector.accessToken, companyId);

    console.log(`✅ ${financeData.length} registros financieros obtenidos de ${erpType}`);
    res.json(financeData);
  } catch (error) {
    console.error(`❌ Error al obtener finanzas de ${erpType}:`, error.message);
    res.status(500).json({ error: `Error al obtener finanzas: ${error.message}` });
  }
};

/**
 * GET /api/erp/:erpType/modules
 * Obtiene los módulos habilitados para un ERP/compañía
 * Retorna la lista de módulos que deben mostrarse en el sidebar
 */
exports.getModules = async (req, res) => {
  const { erpType } = req.params;
  const companyId = req.companyId;

  try {
    console.log(`📋 Obteniendo módulos para ${erpType}, company: ${companyId}`);

    // Buscar configuración personalizada en la BD
    const erpConfig = await prisma.eRPConfig.findFirst({
      where: {
        erpType: erpType,
        companyId: companyId,
        isActive: true
      },
      include: {
        modules: {
          where: { isEnabled: true },
          orderBy: { sortOrder: 'asc' }
        }
      }
    });

    // Si hay configuración personalizada, usar esos módulos
    if (erpConfig && erpConfig.modules.length > 0) {
      const modules = erpConfig.modules.map(m => ({
        id: m.moduleType,
        name: m.displayName || m.moduleType,
        endpoint: m.endpoint,
        sortOrder: m.sortOrder
      }));

      console.log(`✅ ${modules.length} módulos personalizados encontrados`);
      return res.json({ modules, isCustom: true });
    }

    // Si no hay configuración, buscar configuración genérica del ERP
    const genericConfig = await prisma.eRPConfig.findFirst({
      where: {
        erpType: erpType,
        isActive: true
      },
      include: {
        modules: {
          where: { isEnabled: true },
          orderBy: { sortOrder: 'asc' }
        }
      }
    });

    if (genericConfig && genericConfig.modules.length > 0) {
      const modules = genericConfig.modules.map(m => ({
        id: m.moduleType,
        name: m.displayName || m.moduleType,
        endpoint: m.endpoint,
        sortOrder: m.sortOrder
      }));

      console.log(`✅ ${modules.length} módulos genéricos encontrados`);
      return res.json({ modules, isCustom: false });
    }

    // Módulos por defecto si no hay nada en BD
    const defaultModules = [
      { id: 'leads', name: 'Leads', endpoint: 'leads', sortOrder: 1 },
      { id: 'contacts', name: 'Contactos', endpoint: 'contacts', sortOrder: 2 },
      { id: 'finance', name: 'Finanzas', endpoint: 'finance', sortOrder: 3 }
    ];

    console.log(`📋 Usando módulos por defecto`);
    res.json({ modules: defaultModules, isCustom: false });

  } catch (error) {
    console.error(`❌ Error al obtener módulos de ${erpType}:`, error.message);
    res.status(500).json({ error: `Error al obtener módulos: ${error.message}` });
  }
};

/**
 * GET /api/erp/:erpType/:endpoint
 * Endpoint genérico para obtener datos de cualquier módulo personalizado
 */
exports.getGenericData = async (req, res) => {
  const { erpType, endpoint } = req.params;

  try {
    const connector = getConnector(erpType);
    const dbConnector = req.connector;
    const companyId = req.companyId;

    console.log(`📊 Obteniendo datos genéricos de ${erpType}/${endpoint} para company ${companyId}`);

    // Verificar si el conector tiene el método genérico
    if (typeof connector.getGenericData === 'function') {
      const data = await connector.getGenericData(dbConnector.accessToken, endpoint, endpoint, companyId);
      console.log(`✅ ${data.length} registros obtenidos de ${erpType}/${endpoint}`);
      return res.json(data);
    }

    // Fallback: intentar método específico si existe
    const methodName = `get${endpoint.charAt(0).toUpperCase() + endpoint.slice(1)}`;
    if (typeof connector[methodName] === 'function') {
      const data = await connector[methodName](dbConnector.accessToken, companyId);
      console.log(`✅ ${data.length} registros obtenidos usando ${methodName}`);
      return res.json(data);
    }

    // Si no hay método, devolver error
    res.status(404).json({ error: `Endpoint ${endpoint} no disponible para ${erpType}` });

  } catch (error) {
    console.error(`❌ Error al obtener ${endpoint} de ${erpType}:`, error.message);
    res.status(500).json({ error: `Error al obtener datos: ${error.message}` });
  }
};
