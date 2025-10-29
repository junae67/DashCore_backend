// src/connectors/SAPConnector.js
// Conector para SAP Business Technology Platform (BTP)

const axios = require('axios');
const BaseConnector = require('./BaseConnector');

class SAPConnector extends BaseConnector {
  constructor() {
    super({
      clientId: process.env.SAP_CLIENT_ID,
      clientSecret: process.env.SAP_CLIENT_SECRET,
      oauthUrl: process.env.SAP_OAUTH_URL,
      tokenUrl: process.env.SAP_TOKEN_URL,
      apiUrl: process.env.SAP_API_URL,
      redirectUri: process.env.SAP_REDIRECT_URI,
    });
  }

  getAuthUrl(state = '') {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: 'code',
      redirect_uri: this.config.redirectUri,
      scope: 'openid',
    });

    if (state) {
      params.append('state', state);
    }

    return `${this.config.oauthUrl}?${params}`;
  }

  async authenticate(code) {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      code,
      redirect_uri: this.config.redirectUri,
      grant_type: 'authorization_code',
    });

    try {
      const response = await axios.post(this.config.tokenUrl, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      return response.data; // { access_token, refresh_token, id_token, expires_in }
    } catch (error) {
      console.error('❌ Error en SAP authenticate:', error.response?.data || error.message);
      throw new Error('Error al autenticar con SAP BTP');
    }
  }

  async refreshToken(refreshToken) {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    try {
      const response = await axios.post(this.config.tokenUrl, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      return response.data;
    } catch (error) {
      console.error('❌ Error al renovar token de SAP:', error.response?.data || error.message);
      throw new Error('Error al renovar token de SAP BTP');
    }
  }

  async getLeads(accessToken) {
    try {
      // SAP usa "Opportunities" en lugar de "Leads"
      // Nota: Esta URL es un ejemplo, ajusta según tu API de SAP disponible
      const response = await axios.get(`${this.config.apiUrl}/sap/opu/odata/sap/API_OPPORTUNITY/Opportunity`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });

      // SAP OData v2 retorna data.d.results
      return response.data?.d?.results || [];
    } catch (error) {
      console.error('❌ Error al obtener leads de SAP:', error.response?.data || error.message);
      // Si el endpoint no existe en trial, retornar datos simulados
      console.warn('⚠️ Retornando datos simulados de SAP (trial sin datos)');
      return this._getMockLeads();
    }
  }

  async getContacts(accessToken) {
    try {
      const response = await axios.get(`${this.config.apiUrl}/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });

      return response.data?.d?.results || [];
    } catch (error) {
      console.error('❌ Error al obtener contactos de SAP:', error.response?.data || error.message);
      console.warn('⚠️ Retornando datos simulados de SAP (trial sin datos)');
      return this._getMockContacts();
    }
  }

  async getFinanceData(accessToken) {
    try {
      const response = await axios.get(`${this.config.apiUrl}/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrder`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });

      return response.data?.d?.results || [];
    } catch (error) {
      console.error('❌ Error al obtener datos financieros de SAP:', error.response?.data || error.message);
      console.warn('⚠️ Retornando datos simulados de SAP (trial sin datos)');
      return this._getMockFinanceData();
    }
  }

  // ========== DATOS SIMULADOS (para trial sin datos reales) ==========

  _getMockLeads() {
    return [
      {
        OpportunityID: 'SAP-OPP-001',
        OpportunityName: 'Implementación ERP SoftMAS',
        AccountName: 'SoftMAS Colombia',
        ExpectedRevenue: 150000,
        Stage: 'Qualification',
        CreationDate: new Date().toISOString(),
      },
      {
        OpportunityID: 'SAP-OPP-002',
        OpportunityName: 'Migración a S/4HANA',
        AccountName: 'Totto S.A.',
        ExpectedRevenue: 250000,
        Stage: 'Proposal',
        CreationDate: new Date().toISOString(),
      },
    ];
  }

  _getMockContacts() {
    return [
      {
        BusinessPartner: 'BP-001',
        BusinessPartnerFullName: 'Juan Pablo Vargas',
        OrganizationBPName1: 'SoftMAS',
        BusinessPartnerCategory: '1',
        EmailAddress: 'jvargas@soft-mas.com',
      },
      {
        BusinessPartner: 'BP-002',
        BusinessPartnerFullName: 'María González',
        OrganizationBPName1: 'Totto',
        BusinessPartnerCategory: '1',
        EmailAddress: 'mgonzalez@totto.com',
      },
    ];
  }

  _getMockFinanceData() {
    return [
      {
        SalesOrder: 'SO-2025-001',
        SalesOrderType: 'OR',
        CustomerName: 'SoftMAS',
        TotalNetAmount: 50000,
        TransactionCurrency: 'USD',
        CreationDate: new Date().toISOString(),
      },
      {
        SalesOrder: 'SO-2025-002',
        SalesOrderType: 'OR',
        CustomerName: 'Totto',
        TotalNetAmount: 75000,
        TransactionCurrency: 'USD',
        CreationDate: new Date().toISOString(),
      },
    ];
  }
}

module.exports = SAPConnector;
