// src/connectors/BusinessCentralConnector.js
// Conector para Microsoft Dynamics 365 Business Central
// Soporta: Local (Docker con Basic Auth) y Cloud (OAuth2)

const axios = require('axios');
const BaseConnector = require('./BaseConnector');

class BusinessCentralConnector extends BaseConnector {
  constructor() {
    super({
      // Configuración común
      apiUrl: process.env.BC_API_URL,
      companyId: process.env.BC_COMPANY_ID || 'CRONUS USA, Inc.',

      // Modo de autenticación: 'basic' (local) o 'oauth2' (cloud)
      authType: process.env.BC_AUTH_TYPE || 'basic',

      // Basic Auth (para Docker local)
      username: process.env.BC_USERNAME,
      password: process.env.BC_PASSWORD,

      // OAuth2 (para Business Central Cloud)
      clientId: process.env.BC_CLIENT_ID,
      clientSecret: process.env.BC_CLIENT_SECRET,
      tenantId: process.env.BC_TENANT_ID,
      redirectUri: process.env.BC_REDIRECT_URI,
    });

    console.log(`🔧 Business Central Connector iniciado en modo: ${this.config.authType.toUpperCase()}`);
  }

  /**
   * Determina si está en modo local (Basic Auth) o cloud (OAuth2)
   */
  isLocalMode() {
    return this.config.authType === 'basic';
  }

  isCloudMode() {
    return this.config.authType === 'oauth2';
  }

  /**
   * Obtiene URL de autorización
   * - Local: Simula autenticación directa
   * - Cloud: OAuth2 con Azure AD
   */
  getAuthUrl(state = '') {
    const frontendUrl = process.env.NODE_ENV === 'production'
      ? 'https://www.dashcore.app'
      : 'http://localhost:5173';

    if (this.isLocalMode()) {
      // Modo local: Simular autenticación (sin OAuth real)
      console.log('🏠 Modo LOCAL: Autenticación Basic Auth');
      return `${frontendUrl}/inicio?erp=businesscentral&auth=basic`;
    }

    if (this.isCloudMode()) {
      // Modo cloud: OAuth2 con Azure AD (igual que Dynamics 365)
      console.log('☁️ Modo CLOUD: Autenticación OAuth2');
      const params = new URLSearchParams({
        client_id: this.config.clientId,
        response_type: 'code',
        redirect_uri: this.config.redirectUri,
        response_mode: 'query',
        scope: `https://api.businesscentral.dynamics.com/.default offline_access openid profile`,
        state: state || '',
      });
      return `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/authorize?${params}`;
    }

    throw new Error('BC_AUTH_TYPE debe ser "basic" o "oauth2"');
  }

  /**
   * Autentica y obtiene tokens
   * - Local: Genera token Basic Auth
   * - Cloud: Intercambia código por tokens OAuth2
   */
  async authenticate(code) {
    if (this.isLocalMode()) {
      // Modo local: Token Basic Auth
      return {
        access_token: Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64'),
        refresh_token: null,
        expires_in: 3600,
        id_token: this._generateMockIdToken('basic'),
      };
    }

    if (this.isCloudMode()) {
      // Modo cloud: OAuth2 token exchange
      const tokenUrl = `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`;
      const params = new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        redirect_uri: this.config.redirectUri,
        grant_type: 'authorization_code',
        scope: 'https://api.businesscentral.dynamics.com/.default offline_access openid profile',
      });

      const response = await axios.post(tokenUrl, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      return response.data;
    }

    throw new Error('Modo de autenticación no configurado');
  }

  async refreshToken(refreshToken) {
    if (this.isLocalMode()) {
      // Basic Auth no necesita refresh
      return this.authenticate(null);
    }

    if (this.isCloudMode()) {
      // OAuth2 refresh token
      const tokenUrl = `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`;
      const params = new URLSearchParams({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
        scope: 'https://api.businesscentral.dynamics.com/.default',
      });

      const response = await axios.post(tokenUrl, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      return response.data;
    }

    throw new Error('Modo de autenticación no configurado');
  }

  /**
   * Obtiene los headers de autenticación según el modo
   */
  _getAuthHeaders(accessToken) {
    if (this.isLocalMode()) {
      const auth = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');
      return {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
      };
    }

    if (this.isCloudMode()) {
      return {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      };
    }

    throw new Error('Modo de autenticación no configurado');
  }

  /**
   * Obtiene Sales Quotes (equivalente a Leads/Opportunities)
   */
  async getLeads(accessToken) {
    try {
      console.log(`📡 Obteniendo Sales Quotes desde Business Central (${this.config.authType.toUpperCase()})`);

      const response = await axios.get(
        `${this.config.apiUrl}/companies(${encodeURIComponent(this.config.companyId)})/salesQuotes`,
        {
          headers: this._getAuthHeaders(accessToken),
          params: {
            '$top': 100,
          },
        }
      );

      const quotes = response.data?.value || [];

      // Transformar a formato DashCore
      return quotes.map((q) => ({
        OpportunityID: q.number || q.id,
        OpportunityName: q.documentNumber || `Quote ${q.number}`,
        AccountName: q.customerName || 'Business Central Customer',
        ExpectedRevenue: parseFloat(q.totalAmountIncludingTax || q.amount || 0),
        Stage: this._mapQuoteStatus(q.status),
        CreationDate: q.documentDate || q.quoteDate || new Date().toISOString(),
        // Campos compatibles con frontend
        fullname: q.documentNumber || `Quote ${q.number}`,
        companyname: q.customerName || 'Business Central Customer',
        estimatedvalue: parseFloat(q.totalAmountIncludingTax || q.amount || 0),
        leadsourcecode: 4, // Business Central
        statuscode: q.status || 'Draft',
        description: `Business Central Sales Quote ${q.number || ''}`,
      }));

    } catch (error) {
      console.error('❌ Error al obtener Sales Quotes de Business Central:', error.message);

      // Si Business Central no está disponible, retornar datos mock
      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        console.warn('⚠️ Business Central Docker no está corriendo, retornando datos simulados');
        return this._getMockLeads();
      }

      throw new Error(`Error al obtener leads de Business Central: ${error.message}`);
    }
  }

  /**
   * Obtiene Customers (equivalente a Contacts)
   */
  async getContacts(accessToken) {
    try {
      console.log(`📡 Obteniendo Customers desde Business Central (${this.config.authType.toUpperCase()})`);

      const response = await axios.get(
        `${this.config.apiUrl}/companies(${encodeURIComponent(this.config.companyId)})/customers`,
        {
          headers: this._getAuthHeaders(accessToken),
          params: {
            '$top': 100,
          },
        }
      );

      const customers = response.data?.value || [];

      // Transformar a formato DashCore
      return customers.map((c) => ({
        BusinessPartner: c.number || c.id,
        BusinessPartnerFullName: c.displayName || c.name,
        OrganizationBPName1: c.displayName || c.name,
        BusinessPartnerCategory: '2', // Organization
        EmailAddress: c.email || `${c.number}@businesscentral.local`,
        // Campos compatibles con Dynamics
        contactid: c.number || c.id,
        fullname: c.displayName || c.name,
        emailaddress1: c.email || `${c.number}@businesscentral.local`,
        companyname: c.displayName || c.name,
        firstname: '',
        lastname: '',
        telephone1: c.phoneNumber || '',
        description: `Business Central Customer ${c.number || ''}`,
        address: `${c.addressLine1 || ''} ${c.city || ''} ${c.state || ''} ${c.postalCode || ''}`.trim(),
      }));

    } catch (error) {
      console.error('❌ Error al obtener Customers de Business Central:', error.message);

      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        console.warn('⚠️ Business Central Docker no está corriendo, retornando datos simulados');
        return this._getMockContacts();
      }

      throw new Error(`Error al obtener contactos de Business Central: ${error.message}`);
    }
  }

  /**
   * Obtiene Sales Orders para datos financieros
   */
  async getFinanceData(accessToken) {
    try {
      console.log(`📡 Obteniendo Sales Orders desde Business Central (${this.config.authType.toUpperCase()})`);

      const response = await axios.get(
        `${this.config.apiUrl}/companies(${encodeURIComponent(this.config.companyId)})/salesOrders`,
        {
          headers: this._getAuthHeaders(accessToken),
          params: {
            '$top': 100,
          },
        }
      );

      return response.data?.value || [];

    } catch (error) {
      console.error('❌ Error al obtener Sales Orders de Business Central:', error.message);

      if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        return this._getMockFinanceData();
      }

      throw new Error(`Error al obtener datos financieros de Business Central: ${error.message}`);
    }
  }

  // ========== HELPERS ==========

  _mapQuoteStatus(status) {
    const statusMap = {
      'Draft': 'Open',
      'In Review': 'In Progress',
      'Open': 'Open',
      'Sent': 'Sent to Customer',
      'Accepted': 'Won',
      'Expired': 'Lost',
      'Rejected': 'Lost',
    };
    return statusMap[status] || 'Open';
  }

  _generateMockIdToken(mode = 'basic') {
    // Generar un JWT mock para Business Central
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64');
    const payload = Buffer.from(JSON.stringify({
      preferred_username: mode === 'basic' ? 'admin@businesscentral.local' : 'user@customer.com',
      email: mode === 'basic' ? 'admin@businesscentral.local' : 'user@customer.com',
      name: mode === 'basic' ? 'Business Central Admin' : 'Business Central User',
      iss: mode === 'basic' ? 'BusinessCentral' : 'https://login.microsoftonline.com',
      aud: 'DashCore',
      exp: Math.floor(Date.now() / 1000) + 3600,
    })).toString('base64');
    const signature = 'mock-signature';
    return `${header}.${payload}.${signature}`;
  }

  // ========== DATOS SIMULADOS (cuando Docker no está corriendo) ==========

  _getMockLeads() {
    console.log('📦 Retornando datos simulados de Business Central (Docker no disponible)');
    return [
      {
        OpportunityID: 'SQ-1001',
        OpportunityName: 'Office Furniture Quote',
        AccountName: 'Adatum Corporation',
        ExpectedRevenue: 15000,
        Stage: 'Open',
        CreationDate: new Date().toISOString(),
        fullname: 'Office Furniture Quote',
        companyname: 'Adatum Corporation',
        estimatedvalue: 15000,
        leadsourcecode: 4,
        statuscode: 'Draft',
        description: 'Business Central Sales Quote SQ-1001',
      },
      {
        OpportunityID: 'SQ-1002',
        OpportunityName: 'IT Equipment Renewal',
        AccountName: 'Fabrikam, Inc.',
        ExpectedRevenue: 45000,
        Stage: 'Sent to Customer',
        CreationDate: new Date().toISOString(),
        fullname: 'IT Equipment Renewal',
        companyname: 'Fabrikam, Inc.',
        estimatedvalue: 45000,
        leadsourcecode: 4,
        statuscode: 'Sent',
        description: 'Business Central Sales Quote SQ-1002',
      },
      {
        OpportunityID: 'SQ-1003',
        OpportunityName: 'Annual Service Contract',
        AccountName: 'Contoso Ltd.',
        ExpectedRevenue: 28000,
        Stage: 'In Progress',
        CreationDate: new Date().toISOString(),
        fullname: 'Annual Service Contract',
        companyname: 'Contoso Ltd.',
        estimatedvalue: 28000,
        leadsourcecode: 4,
        statuscode: 'In Review',
        description: 'Business Central Sales Quote SQ-1003',
      },
    ];
  }

  _getMockContacts() {
    console.log('📦 Retornando contactos simulados de Business Central (Docker no disponible)');
    return [
      {
        BusinessPartner: 'C-10000',
        BusinessPartnerFullName: 'Adatum Corporation',
        OrganizationBPName1: 'Adatum Corporation',
        BusinessPartnerCategory: '2',
        EmailAddress: 'contact@adatum.com',
        contactid: 'C-10000',
        fullname: 'Adatum Corporation',
        emailaddress1: 'contact@adatum.com',
        companyname: 'Adatum Corporation',
        telephone1: '+1-425-555-0100',
        description: 'Business Central Customer C-10000',
        address: '192 Market Square, Atlanta, GA 31772',
      },
      {
        BusinessPartner: 'C-10100',
        BusinessPartnerFullName: 'Fabrikam, Inc.',
        OrganizationBPName1: 'Fabrikam, Inc.',
        BusinessPartnerCategory: '2',
        EmailAddress: 'info@fabrikam.com',
        contactid: 'C-10100',
        fullname: 'Fabrikam, Inc.',
        emailaddress1: 'info@fabrikam.com',
        companyname: 'Fabrikam, Inc.',
        telephone1: '+1-425-555-0101',
        description: 'Business Central Customer C-10100',
        address: '7122 South Ashford Street, Miami, FL 33125',
      },
      {
        BusinessPartner: 'C-10200',
        BusinessPartnerFullName: 'Contoso Ltd.',
        OrganizationBPName1: 'Contoso Ltd.',
        BusinessPartnerCategory: '2',
        EmailAddress: 'sales@contoso.com',
        contactid: 'C-10200',
        fullname: 'Contoso Ltd.',
        emailaddress1: 'sales@contoso.com',
        companyname: 'Contoso Ltd.',
        telephone1: '+1-425-555-0102',
        description: 'Business Central Customer C-10200',
        address: '5678 Main Street, Phoenix, AZ 85004',
      },
    ];
  }

  _getMockFinanceData() {
    return [
      {
        number: 'SO-1001',
        customerName: 'Adatum Corporation',
        totalAmountIncludingTax: 12500,
        orderDate: new Date().toISOString(),
        status: 'Open',
      },
      {
        number: 'SO-1002',
        customerName: 'Fabrikam, Inc.',
        totalAmountIncludingTax: 38000,
        orderDate: new Date().toISOString(),
        status: 'Shipped',
      },
    ];
  }
}

module.exports = BusinessCentralConnector;
