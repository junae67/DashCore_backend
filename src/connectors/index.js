/**
 * ARCHIVO: connectors/index.js
 * DESCRIPCIÓN: Factory Pattern para gestión de conectores ERP
 *
 * RESPONSABILIDADES:
 * - Crear y mantener instancias singleton de cada conector
 * - Proporcionar método factory getConnector() para obtener conector por tipo
 * - Exponer lista de ERPs soportados
 * - Centralizar la gestión de todos los conectores
 *
 * DEPENDENCIAS:
 * - ./DynamicsConnector: Conector para Dynamics 365
 * - ./SAPConnector: Conector para SAP BTP
 *
 * RELACIONES:
 * - Usado por todos los controladores que necesitan conectores
 * - Importado por erp.controller.js, dynamics.controller.js
 * - Los controladores llaman getConnector(erpType) para obtener instancia
 * - Mantiene una única instancia de cada conector (singleton)
 *
 * PATRÓN DE DISEÑO:
 * - Factory Pattern: getConnector() crea/retorna instancia según tipo
 * - Singleton Pattern: Solo una instancia de cada conector
 *
 * USO:
 * const { getConnector } = require('./connectors');
 * const connector = getConnector('dynamics365');
 * await connector.getLeads(accessToken);
 */

// src/connectors/index.js
// Factory para obtener el conector adecuado según el tipo de ERP

const DynamicsConnector = require('./DynamicsConnector');
const SAPConnector = require('./SAPConnector');
const BusinessCentralConnector = require('./BusinessCentralConnector');

// Instancias singleton de cada conector
const connectors = {
  dynamics365: new DynamicsConnector(),
  sap: new SAPConnector(),
   businesscentral: new BusinessCentralConnector(), 
 
  // Futuros conectores:
  // oracle: new OracleConnector(),
  // salesforce: new SalesforceConnector(),
};

/**
 * Obtiene el conector adecuado según el tipo de ERP
 * @param {string} erpType - 'dynamics365', 'sap', 'oracle', etc.
 * @returns {BaseConnector} Instancia del conector
 * @throws {Error} Si el tipo de ERP no está soportado
 */
function getConnector(erpType) {
  const connector = connectors[erpType];

  if (!connector) {
    throw new Error(`Conector no soportado: ${erpType}. ERPs disponibles: ${Object.keys(connectors).join(', ')}`);
  }

  return connector;
}

/**
 * Obtiene la lista de ERPs soportados
 * @returns {Array<string>} Lista de tipos de ERP
 */
function getSupportedERPs() {
  return Object.keys(connectors);
}

module.exports = {
  getConnector,
  getSupportedERPs,
};
