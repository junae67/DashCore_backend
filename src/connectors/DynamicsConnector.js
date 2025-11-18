/**
 * ARCHIVO: connectors/DynamicsConnector.js
 * DESCRIPCIÓN: Conector para Microsoft Dynamics 365 CRM
 *
 * RESPONSABILIDADES:
 * - Implementar autenticación OAuth2 con Microsoft Azure AD
 * - Obtener leads, contactos y datos financieros de Dynamics 365
 * - Interactuar con API OData v9.2 de Dynamics 365
 * - Manejar tokens de acceso y refresh tokens
 *
 * DEPENDENCIAS:
 * - axios: Cliente HTTP para peticiones a Dynamics API
 * - ./BaseConnector: Clase padre con interfaz común
 *
 * RELACIONES:
 * - Extiende BaseConnector
 * - Usado por erp.controller.js y dynamics.controller.js
 * - Se instancia como singleton en connectors/index.js
 * - Requiere variables de entorno DYNAMICS_*
 *
 * ENDPOINTS PRINCIPALES:
 * - OAuth: login.microsoftonline.com/organizations/oauth2/v2.0/
 * - API: {DYNAMICS_RESOURCE}/api/data/v9.2/
 * - Entidades: leads, contacts, salesorders
 *
 * CONFIGURACIÓN REQUERIDA (.env):
 * - DYNAMICS_CLIENT_ID
 * - DYNAMICS_CLIENT_SECRET
 * - DYNAMICS_REDIRECT_URI
 * - DYNAMICS_RESOURCE (URL de la instancia)
 */

// src/connectors/DynamicsConnector.js
// Conector para Microsoft Dynamics 365

const axios = require('axios');
const BaseConnector = require('./BaseConnector');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class DynamicsConnector extends BaseConnector {
  constructor() {
    super({
      clientId: process.env.DYNAMICS_CLIENT_ID,
      clientSecret: process.env.DYNAMICS_CLIENT_SECRET,
      redirectUri: process.env.DYNAMICS_REDIRECT_URI,
      resource: process.env.DYNAMICS_RESOURCE,
    });
  }

  /**
   * Obtiene la configuración de endpoint para un módulo específico
   * @param {string} companyId - ID de la compañía
   * @param {string} moduleType - Tipo de módulo ('leads', 'contacts', 'finance')
   * @returns {Promise<{endpoint: string, config: object}>}
   */
  async _getModuleConfig(companyId, moduleType) {
    try {
      const erpConfig = await prisma.eRPConfig.findUnique({
        where: {
          companyId_erpType: {
            companyId,
            erpType: 'dynamics365',
          },
        },
        include: {
          modules: {
            where: {
              moduleType,
              isEnabled: true,
            },
          },
        },
      });

      if (erpConfig && erpConfig.modules.length > 0) {
        const moduleConfig = erpConfig.modules[0];
        console.log(`📦 Usando endpoint configurado: ${moduleConfig.endpoint} para módulo ${moduleType}`);
        return {
          endpoint: moduleConfig.endpoint,
          config: moduleConfig,
        };
      }

      // Fallback a endpoints por defecto
      const defaultEndpoints = {
        leads: 'leads',
        contacts: 'contacts',
        finance: 'salesorders',
      };

      console.log(`⚠️  No hay configuración personalizada, usando endpoint por defecto: ${defaultEndpoints[moduleType]}`);
      return {
        endpoint: defaultEndpoints[moduleType],
        config: null,
      };
    } catch (error) {
      console.error(`❌ Error al obtener configuración de módulo: ${error.message}`);
      // Fallback en caso de error
      const defaultEndpoints = {
        leads: 'leads',
        contacts: 'contacts',
        finance: 'salesorders',
      };
      return {
        endpoint: defaultEndpoints[moduleType],
        config: null,
      };
    }
  }

  getAuthUrl(state = '') {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: 'code',
      redirect_uri: this.config.redirectUri,
      response_mode: 'query',
      scope: `${this.config.resource}/.default offline_access openid profile`,
    });

    if (state) {
      params.append('state', state);
    }

    return `https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize?${params}`;
  }

  async authenticate(code) {
    const tokenUrl = 'https://login.microsoftonline.com/organizations/oauth2/v2.0/token';

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      code,
      redirect_uri: this.config.redirectUri,
      grant_type: 'authorization_code',
      scope: `${this.config.resource}/.default offline_access openid profile`,
    });

    try {
      const response = await axios.post(tokenUrl, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      return response.data; // { access_token, refresh_token, id_token, expires_in }
    } catch (error) {
      console.error('❌ Error en Dynamics authenticate:', error.response?.data || error.message);
      throw new Error('Error al autenticar con Dynamics 365');
    }
  }

  async refreshToken(refreshToken) {
    const tokenUrl = 'https://login.microsoftonline.com/organizations/oauth2/v2.0/token';

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      scope: `${this.config.resource}/.default offline_access`,
    });

    try {
      const response = await axios.post(tokenUrl, params);
      return response.data;
    } catch (error) {
      console.error('❌ Error al renovar token de Dynamics:', error.response?.data || error.message);
      throw new Error('Error al renovar token de Dynamics 365');
    }
  }

  async getLeads(accessToken, companyId = null) {
    try {
      // Obtener configuración de endpoint para el módulo 'leads'
      const { endpoint } = companyId
        ? await this._getModuleConfig(companyId, 'leads')
        : { endpoint: 'leads' }; // Fallback si no se proporciona companyId

      console.log(`📡 Consultando endpoint: ${endpoint} para leads de Dynamics 365`);

      const response = await axios.get(`${this.config.resource}/api/data/v9.2/${endpoint}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
        },
      });

      return response.data.value || [];
    } catch (error) {
      console.error('❌ Error al obtener leads de Dynamics:', error.response?.data || error.message);
      throw new Error('Error al obtener leads de Dynamics 365');
    }
  }

  async getContacts(accessToken, companyId = null) {
    try {
      // Obtener configuración de endpoint para el módulo 'contacts'
      const { endpoint } = companyId
        ? await this._getModuleConfig(companyId, 'contacts')
        : { endpoint: 'contacts' }; // Fallback si no se proporciona companyId

      console.log(`📡 Consultando endpoint: ${endpoint} para contactos de Dynamics 365`);

      const response = await axios.get(`${this.config.resource}/api/data/v9.2/${endpoint}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
        },
      });

      return response.data.value || [];
    } catch (error) {
      console.error('❌ Error al obtener contactos de Dynamics:', error.response?.data || error.message);
      throw new Error('Error al obtener contactos de Dynamics 365');
    }
  }

  async getFinanceData(accessToken, companyId = null) {
    try {
      // Obtener configuración de endpoint para el módulo 'finance'
      const { endpoint } = companyId
        ? await this._getModuleConfig(companyId, 'finance')
        : { endpoint: 'salesorders' }; // Fallback si no se proporciona companyId

      console.log(`📡 Consultando endpoint: ${endpoint} para finanzas de Dynamics 365`);

      const response = await axios.get(`${this.config.resource}/api/data/v9.2/${endpoint}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
        },
      });

      return response.data.value || [];
    } catch (error) {
      console.error('❌ Error al obtener datos financieros de Dynamics:', error.response?.data || error.message);
      throw new Error('Error al obtener finanzas de Dynamics 365');
    }
  }
}

module.exports = DynamicsConnector;
