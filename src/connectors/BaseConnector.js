// src/connectors/BaseConnector.js
// Clase base abstracta para todos los conectores ERP

class BaseConnector {
  constructor(config) {
    this.config = config;
  }

  /**
   * Genera la URL de autorización OAuth2
   * @param {string} state - Estado opcional para CSRF protection
   * @returns {string} URL completa de autorización
   */
  getAuthUrl(state = '') {
    throw new Error('getAuthUrl() debe ser implementado por la clase hija');
  }

  /**
   * Intercambia el código de autorización por tokens
   * @param {string} code - Código de autorización de OAuth2
   * @returns {Promise<Object>} { access_token, refresh_token, id_token, expires_in }
   */
  async authenticate(code) {
    throw new Error('authenticate() debe ser implementado por la clase hija');
  }

  /**
   * Renueva el access token usando el refresh token
   * @param {string} refreshToken
   * @returns {Promise<Object>} { access_token, expires_in }
   */
  async refreshToken(refreshToken) {
    throw new Error('refreshToken() debe ser implementado por la clase hija');
  }

  /**
   * Obtiene leads desde el ERP
   * @param {string} accessToken
   * @returns {Promise<Array>} Lista de leads
   */
  async getLeads(accessToken) {
    throw new Error('getLeads() debe ser implementado por la clase hija');
  }

  /**
   * Obtiene contactos desde el ERP
   * @param {string} accessToken
   * @returns {Promise<Array>} Lista de contactos
   */
  async getContacts(accessToken) {
    throw new Error('getContacts() debe ser implementado por la clase hija');
  }

  /**
   * Obtiene datos financieros desde el ERP
   * @param {string} accessToken
   * @returns {Promise<Array>} Datos financieros
   */
  async getFinanceData(accessToken) {
    throw new Error('getFinanceData() debe ser implementado por la clase hija');
  }

  /**
   * Decodifica un JWT sin verificar la firma
   * @param {string} token
   * @returns {Object} Payload del token
   */
  decodeJWT(token) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Token JWT inválido');
      }

      const payload = Buffer.from(parts[1], 'base64').toString('utf8');
      return JSON.parse(payload);
    } catch (error) {
      throw new Error(`Error al decodificar JWT: ${error.message}`);
    }
  }
}

module.exports = BaseConnector;
