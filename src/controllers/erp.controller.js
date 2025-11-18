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
