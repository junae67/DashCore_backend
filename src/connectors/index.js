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
