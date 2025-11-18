/**
 * ARCHIVO: connectors/SAPConnector.js
 * DESCRIPCIÓN: Conector para SAP Business Technology Platform (BTP)
 *
 * RESPONSABILIDADES:
 * - Implementar autenticación OAuth2 con SAP BTP
 * - Obtener datos desde SAP API Business Hub (sandbox con datos reales)
 * - Obtener leads (Sales Quotations), contactos (Business Partners) y finanzas
 * - Proporcionar datos mock cuando no hay conexión real
 * - Transformar datos de SAP OData al formato DashCore
 *
 * DEPENDENCIAS:
 * - axios: Cliente HTTP para peticiones a SAP APIs
 * - ./BaseConnector: Clase padre con interfaz común
 *
 * RELACIONES:
 * - Extiende BaseConnector
 * - Usado por erp.controller.js
 * - Se instancia como singleton en connectors/index.js
 * - Soporta dos modos: API Hub (sandbox) y BTP Trial (sin datos)
 *
 * ENDPOINTS:
 * - OAuth: Variable SAP_OAUTH_URL
 * - API Hub: SAP_API_HUB_URL (datos reales de sandbox)
 * - BTP Trial: SAP_API_URL (usualmente sin datos)
 *
 * CONFIGURACIÓN REQUERIDA (.env):
 * - SAP_CLIENT_ID, SAP_CLIENT_SECRET
 * - SAP_OAUTH_URL, SAP_TOKEN_URL
 * - SAP_API_URL, SAP_REDIRECT_URI
 * - SAP_API_HUB_KEY (opcional, para sandbox con datos)
 * - SAP_API_HUB_URL (opcional, para sandbox)
 *
 * ENTIDADES SAP UTILIZADAS:
 * - API_SALES_QUOTATION_SRV/A_SalesQuotation (leads)
 * - API_BUSINESS_PARTNER/A_BusinessPartner (contactos)
 * - API_SALES_ORDER_SRV/A_SalesOrder (finanzas)
 */

// src/connectors/SAPConnector.js
// Conector para SAP Business Technology Platform (BTP)

const axios = require('axios');
const BaseConnector = require('./BaseConnector');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class SAPConnector extends BaseConnector {
  constructor() {
    super({
      clientId: process.env.SAP_CLIENT_ID,
      clientSecret: process.env.SAP_CLIENT_SECRET,
      oauthUrl: process.env.SAP_OAUTH_URL,
      tokenUrl: process.env.SAP_TOKEN_URL,
      apiUrl: process.env.SAP_API_URL,
      redirectUri: process.env.SAP_REDIRECT_URI,
      // API Hub para datos reales
      apiHubKey: process.env.SAP_API_HUB_KEY,
      apiHubUrl: process.env.SAP_API_HUB_URL,
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
            erpType: 'sap',
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
        leads: 'API_SALES_QUOTATION_SRV/A_SalesQuotation',
        contacts: 'API_BUSINESS_PARTNER/A_BusinessPartner',
        finance: 'API_SALES_ORDER_SRV/A_SalesOrder',
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
        leads: 'API_SALES_QUOTATION_SRV/A_SalesQuotation',
        contacts: 'API_BUSINESS_PARTNER/A_BusinessPartner',
        finance: 'API_SALES_ORDER_SRV/A_SalesOrder',
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

  async getLeads(accessToken, companyId = null) {
    // Obtener configuración de endpoint para el módulo 'leads'
    const { endpoint } = companyId
      ? await this._getModuleConfig(companyId, 'leads')
      : { endpoint: 'API_SALES_QUOTATION_SRV/A_SalesQuotation' }; // Fallback

    console.log(`📡 Consultando endpoint: ${endpoint} para leads de SAP`);

    // Si tenemos API Hub Key, usar sandbox con datos reales
    if (this.config.apiHubKey && this.config.apiHubKey !== 'YOUR_API_KEY_HERE') {
      try {
        console.log('📡 Obteniendo leads desde SAP API Business Hub (datos reales)');

        // SAP API Hub - Usar endpoint configurado
        const response = await axios.get(`${this.config.apiHubUrl}/sap/opu/odata/sap/${endpoint}`, {
          headers: {
            'APIKey': this.config.apiHubKey,
            'Accept': 'application/json',
          },
          params: {
            '$top': 100,
            '$format': 'json',
            '$inlinecount': 'allpages', // Para saber cuántos hay en total
          },
        });

        // Transformar datos de SAP al formato de DashCore
        const quotations = response.data?.d?.results || [];

        // Mapear códigos de estado de SAP a nombres descriptivos
        const statusMap = {
          'A': 'Not yet processed',
          'B': 'Partially processed',
          'C': 'Completely processed',
        };

        return quotations.map((q) => ({
          OpportunityID: q.SalesQuotation || '',
          OpportunityName: `Cotización ${q.SalesQuotation || 'N/A'}`,
          AccountName: q.SoldToParty || 'Cliente SAP',
          ExpectedRevenue: parseFloat(q.TotalNetAmount || 0),
          Stage: statusMap[q.OverallSDProcessStatus] || 'Open',
          CreationDate: q.CreationDate || new Date().toISOString(),
          // Campos compatibles con frontend de Dynamics
          fullname: `Cotización ${q.SalesQuotation || 'N/A'}`,
          companyname: q.SoldToParty || 'Cliente SAP',
          estimatedvalue: parseFloat(q.TotalNetAmount || 0),
          leadsourcecode: 3, // Partner
          // Campos adicionales para compatibilidad
          statuscode: q.OverallSDProcessStatus || 'Open',
          description: `SAP Sales Quotation ${q.SalesQuotation || ''}`,
        }));
      } catch (error) {
        console.error('❌ Error al obtener datos de API Hub:', error.response?.data || error.message);
        console.warn('⚠️ Retornando datos simulados');
        return this._getMockLeads();
      }
    }

    // Fallback: Intentar SAP BTP Trial (probablemente sin datos)
    try {
      const response = await axios.get(`${this.config.apiUrl}/sap/opu/odata/sap/${endpoint}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });

      return response.data?.d?.results || [];
    } catch (error) {
      console.error('❌ Error al obtener leads de SAP BTP:', error.response?.data || error.message);
      console.warn('⚠️ Retornando datos simulados (trial sin datos)');
      return this._getMockLeads();
    }
  }

  async getContacts(accessToken, companyId = null) {
    // Obtener configuración de endpoint para el módulo 'contacts'
    const { endpoint } = companyId
      ? await this._getModuleConfig(companyId, 'contacts')
      : { endpoint: 'API_BUSINESS_PARTNER/A_BusinessPartner' }; // Fallback

    console.log(`📡 Consultando endpoint: ${endpoint} para contactos de SAP`);

    // Si tenemos API Hub Key, usar sandbox con datos reales
    if (this.config.apiHubKey && this.config.apiHubKey !== 'YOUR_API_KEY_HERE') {
      try {
        console.log('📡 Obteniendo contactos desde SAP API Business Hub (datos reales)');

        const response = await axios.get(`${this.config.apiHubUrl}/sap/opu/odata/sap/${endpoint}`, {
          headers: {
            'APIKey': this.config.apiHubKey,
            'Accept': 'application/json',
          },
          params: {
            '$top': 100,
            '$format': 'json',
            '$filter': "BusinessPartnerCategory eq '1'", // Solo personas
            '$inlinecount': 'allpages', // Para saber cuántos hay en total
          },
        });

        const partners = response.data?.d?.results || [];
        return partners.map((p) => ({
          BusinessPartner: p.BusinessPartner || '',
          BusinessPartnerFullName: p.BusinessPartnerFullName || p.BusinessPartnerName || 'SAP Contact',
          OrganizationBPName1: p.OrganizationBPName1 || p.BusinessPartnerGrouping || 'SAP Customer',
          BusinessPartnerCategory: p.BusinessPartnerCategory || '1',
          EmailAddress: p.DefaultEmailAddress || `${p.BusinessPartner || 'contact'}@sapcustomer.com`,
          // Campos compatibles con Dynamics
          contactid: p.BusinessPartner || '',
          fullname: p.BusinessPartnerFullName || p.BusinessPartnerName || 'SAP Contact',
          emailaddress1: p.DefaultEmailAddress || `${p.BusinessPartner || 'contact'}@sapcustomer.com`,
          companyname: p.OrganizationBPName1 || p.BusinessPartnerGrouping || 'SAP Customer',
          // Campos adicionales para compatibilidad
          firstname: p.FirstName || '',
          lastname: p.LastName || '',
          telephone1: p.PhoneNumber || '',
          description: `SAP Business Partner ${p.BusinessPartner || ''}`,
        }));
      } catch (error) {
        console.error('❌ Error al obtener contactos de API Hub:', error.response?.data || error.message);
        console.warn('⚠️ Retornando datos simulados');
        return this._getMockContacts();
      }
    }

    // Fallback: Intentar SAP BTP Trial
    try {
      const response = await axios.get(`${this.config.apiUrl}/sap/opu/odata/sap/${endpoint}`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });

      return response.data?.d?.results || [];
    } catch (error) {
      console.error('❌ Error al obtener contactos de SAP BTP:', error.response?.data || error.message);
      console.warn('⚠️ Retornando datos simulados (trial sin datos)');
      return this._getMockContacts();
    }
  }

  async getFinanceData(accessToken, companyId = null) {
    try {
      // Obtener configuración de endpoint para el módulo 'finance'
      const { endpoint } = companyId
        ? await this._getModuleConfig(companyId, 'finance')
        : { endpoint: 'API_SALES_ORDER_SRV/A_SalesOrder' }; // Fallback

      console.log(`📡 Consultando endpoint: ${endpoint} para finanzas de SAP`);

      const response = await axios.get(`${this.config.apiUrl}/sap/opu/odata/sap/${endpoint}`, {
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
