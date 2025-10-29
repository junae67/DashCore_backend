// src/connectors/DynamicsConnector.js
// Conector para Microsoft Dynamics 365

const axios = require('axios');
const BaseConnector = require('./BaseConnector');

class DynamicsConnector extends BaseConnector {
  constructor() {
    super({
      clientId: process.env.DYNAMICS_CLIENT_ID,
      clientSecret: process.env.DYNAMICS_CLIENT_SECRET,
      redirectUri: process.env.DYNAMICS_REDIRECT_URI,
      resource: process.env.DYNAMICS_RESOURCE,
    });
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

  async getLeads(accessToken) {
    try {
      const response = await axios.get(`${this.config.resource}/api/data/v9.2/leads`, {
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

  async getContacts(accessToken) {
    try {
      const response = await axios.get(`${this.config.resource}/api/data/v9.2/contacts`, {
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

  async getFinanceData(accessToken) {
    try {
      // Ejemplo: Obtener Sales Orders
      const response = await axios.get(`${this.config.resource}/api/data/v9.2/salesorders`, {
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
