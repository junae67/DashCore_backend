/**
 * ARCHIVO: connectors/BusinessCentralConnector.js
 * DESCRIPCIÓN: Conector para Microsoft Dynamics 365 Business Central
 *
 * RESPONSABILIDADES:
 * - Soportar dos modos de autenticación: Basic Auth (local) y OAuth2 (cloud)
 * - Conectar con Business Central en Docker (desarrollo) o Cloud (producción)
 * - Obtener Sales Orders, Customers y datos financieros
 * - Generar JWTs personalizados para modo Basic Auth
 * - Consultar configuración de endpoints personalizados desde BD
 * - Proporcionar datos mock cuando Docker no está disponible
 *
 * DEPENDENCIAS:
 * - axios: Cliente HTTP para peticiones
 * - https: Para agente HTTPS con SSL deshabilitado (desarrollo)
 * - jsonwebtoken: Para generar/verificar JWTs
 * - ./BaseConnector: Clase padre
 * - @prisma/client: Para consultar configuración de endpoints
 *
 * RELACIONES:
 * - Extiende BaseConnector
 * - Usado por erp.controller.js
 * - Consulta tabla ERPConfig para endpoints personalizados
 * - Se instancia como singleton en connectors/index.js
 *
 * MODOS DE OPERACIÓN:
 * 1. LOCAL (BC_AUTH_TYPE=basic):
 *    - Usa Basic Auth con usuario/contraseña
 *    - Típicamente con Docker en localhost
 *    - Genera JWT firmado con credenciales incluidas
 * 2. CLOUD (BC_AUTH_TYPE=oauth2):
 *    - Usa OAuth2 con Azure AD
 *    - Para Business Central Cloud
 *    - Similar a Dynamics 365
 *
 * CONFIGURACIÓN REQUERIDA (.env):
 * - BC_AUTH_TYPE: 'basic' o 'oauth2'
 * - BC_API_URL: URL base de la API
 * - BC_COMPANY_ID: ID de compañía (opcional)
 * - Para Basic Auth: BC_USERNAME, BC_PASSWORD
 * - Para OAuth2: BC_CLIENT_ID, BC_CLIENT_SECRET, BC_TENANT_ID, BC_REDIRECT_URI
 *
 * ENDPOINTS PRINCIPALES:
 * - /customers: Clientes
 * - /salesOrders: Órdenes de venta
 * - /salesQuotes: Cotizaciones
 * - /salesInvoices: Facturas
 * - Soporta endpoints configurables por cliente desde BD
 */

// src/connectors/BusinessCentralConnector.js
// Conector para Microsoft Dynamics 365 Business Central
// Soporta: Local (Docker con Basic Auth) y Cloud (OAuth2)

const axios = require('axios');
const https = require('https');
const jwt = require('jsonwebtoken');
const BaseConnector = require('./BaseConnector');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Agente HTTPS que ignora errores SSL (solo para desarrollo/ngrok)
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

class BusinessCentralConnector extends BaseConnector {
  constructor() {
    super({
      // Configuración común
      apiUrl: process.env.BC_API_URL,
      companyId: process.env.BC_COMPANY_ID || '', // Dejar vacío si no está configurado

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

    console.log('\n🔧 ========== BC CONNECTOR INICIADO ==========');
    console.log(`📍 Modo: ${this.config.authType.toUpperCase()}`);
    console.log(`🌐 API URL: ${this.config.apiUrl}`);
    console.log(`👤 Username: ${this.config.username || 'NO CONFIGURADO'}`);
    console.log(`🔑 Password: ${this.config.password ? '***' + this.config.password.slice(-3) : 'NO CONFIGURADO'}`);
    console.log(`🏢 Company ID: ${this.config.companyId}`);
    console.log('==============================================\n');
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
      // Modo local: Generar JWT válido
      const basicAuth = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');
      const accessToken = this._generateValidJWT(this.config.username, basicAuth);
      const idToken = this._generateValidJWT(this.config.username, basicAuth);

      return {
        access_token: accessToken,
        refresh_token: null,
        expires_in: 3600,
        id_token: idToken,
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
        httpsAgent: httpsAgent, // SSL fix
        timeout: 300000,
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
        httpsAgent: httpsAgent, // SSL fix
        timeout: 300000,
      });

      return response.data;
    }

    throw new Error('Modo de autenticación no configurado');
  }

  /**
   * Obtiene los headers de autenticación según el modo
   */
  _getAuthHeaders(accessToken) {
    console.log('🔐 Generando headers de autenticación...');

    if (this.isLocalMode()) {
      try {
        // Decodificar el JWT para extraer las credenciales Basic Auth
        const secret = process.env.JWT_SECRET || 'dashcore-bc-secret';
        const decoded = jwt.verify(accessToken, secret);
        const basicAuth = decoded.basic_auth;

        console.log('✅ JWT decodificado correctamente');
        console.log(`📝 Auth Base64 (primeros 20 chars): ${basicAuth.substring(0, 20)}...`);

        return {
          'Authorization': `Basic ${basicAuth}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        };
      } catch (error) {
        console.error('❌ Error al decodificar JWT:', error.message);
        console.log('🔄 Usando fallback: credenciales del config');

        // Fallback: usar credenciales del config
        const auth = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');
        console.log(`📝 Auth Base64 (primeros 20 chars): ${auth.substring(0, 20)}...`);

        return {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        };
      }
    }

    if (this.isCloudMode()) {
      console.log('☁️ Usando Bearer token OAuth2');
      console.log(`📝 Token (primeros 20 chars): ${accessToken.substring(0, 20)}...`);

      return {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      };
    }

    throw new Error('Modo de autenticación no configurado');
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
            erpType: 'businesscentral',
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
        leads: 'salesOrders', // Cambiado de salesQuotes a salesOrders
        contacts: 'customers',
        finance: 'salesInvoices',
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
        leads: 'salesOrders',
        contacts: 'customers',
        finance: 'salesInvoices',
      };
      return {
        endpoint: defaultEndpoints[moduleType],
        config: null,
      };
    }
  }

  /**
   * Obtiene Sales Quotes (equivalente a Leads/Opportunities)
   * NOTA: El endpoint real ahora depende de la configuración del cliente
   */
  async getLeads(accessToken, companyId = null) {
    const startTime = Date.now();

    try {
      console.log('\n📡 ========== OBTENIENDO LEADS/OPPORTUNITIES ==========');
      console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
      console.log(`📍 Modo: ${this.config.authType.toUpperCase()}`);

      // Obtener configuración de endpoint para el módulo 'leads'
      const { endpoint } = companyId
        ? await this._getModuleConfig(companyId, 'leads')
        : { endpoint: 'salesOrders' }; // Fallback si no se proporciona companyId

      // Si el endpoint no requiere company ID, usar directamente el endpoint
      const useDirectEndpoint = !this.config.companyId || this.config.companyId === '';
      let url;

      if (useDirectEndpoint) {
        url = `${this.config.apiUrl}/${endpoint}`;
        console.log(`🔗 Usando endpoint directo: /${endpoint}`);
      } else {
        // OData requiere que el Company ID esté entre comillas simples y URL encoded
        const encodedCompanyId = encodeURIComponent(`'${this.config.companyId}'`);
        url = `${this.config.apiUrl}/companies(${encodedCompanyId})/${endpoint}`;
        console.log(`🔗 Usando endpoint con company ID: /companies(...)/${endpoint}`);
      }

      console.log(`🌐 URL completa: ${url}`);
      console.log('⏳ Iniciando petición...');

      const response = await axios.get(url, {
        headers: this._getAuthHeaders(accessToken),
        params: { '$top': 100 },
        httpsAgent: httpsAgent, // SSL fix
        timeout: 300000, // 5 minutos
        validateStatus: (status) => status >= 200 && status < 600,
      });

      const duration = Date.now() - startTime;
      console.log(`✅ Petición completada en: ${duration}ms`);
      console.log(`📊 Status Code: ${response.status}`);
      console.log(`📏 Tamaño respuesta: ${JSON.stringify(response.data).length} bytes`);

      if (response.status < 200 || response.status >= 300) {
        console.error(`❌ Error HTTP ${response.status}`);
        console.error(`📄 Respuesta:`, JSON.stringify(response.data, null, 2));
        throw new Error(`HTTP ${response.status}: ${JSON.stringify(response.data)}`);
      }

      const quotes = response.data?.value || [];
      console.log(`📊 Registros recibidos: ${quotes.length}`);

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
      const duration = Date.now() - startTime;
      console.error('\n❌ ========== ERROR EN SALES QUOTES ==========');
      console.error(`⏱️ Duración antes del error: ${duration}ms`);
      console.error(`❌ Tipo de error: ${error.name}`);
      console.error(`💬 Mensaje: ${error.message}`);

      if (error.response) {
        console.error(`📊 Status Code: ${error.response.status}`);
        console.error(`📄 Respuesta:`, JSON.stringify(error.response.data, null, 2));
        console.error(`📋 Headers:`, JSON.stringify(error.response.headers, null, 2));
      } else if (error.request) {
        console.error('📡 No se recibió respuesta del servidor');
        console.error('🔧 Request headers:', JSON.stringify(error.config?.headers, null, 2));
      } else {
        console.error('⚙️ Error en configuración:', error.message);
      }

      console.error('📚 Stack trace:', error.stack);

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
    const startTime = Date.now();

    try {
      console.log('\n📡 ========== OBTENIENDO CUSTOMERS ==========');
      console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
      console.log(`📍 Modo: ${this.config.authType.toUpperCase()}`);

      // Si el endpoint no requiere company ID, usar directamente /customers
      const useDirectEndpoint = !this.config.companyId || this.config.companyId === '';
      let url;

      if (useDirectEndpoint) {
        url = `${this.config.apiUrl}/customers`;
        console.log('🔗 Usando endpoint directo (sin company ID)');
      } else {
        // OData requiere que el Company ID esté entre comillas simples y URL encoded
        const encodedCompanyId = encodeURIComponent(`'${this.config.companyId}'`);
        url = `${this.config.apiUrl}/companies(${encodedCompanyId})/customers`;
        console.log('🔗 Usando endpoint con company ID');
      }

      console.log(`🌐 URL completa: ${url}`);
      console.log('⏳ Iniciando petición...');

      const response = await axios.get(url, {
        headers: this._getAuthHeaders(accessToken),
        params: { '$top': 100 },
        httpsAgent: httpsAgent, // SSL fix
        timeout: 300000, // 5 minutos
        validateStatus: (status) => status >= 200 && status < 600,
      });

      const duration = Date.now() - startTime;
      console.log(`✅ Petición completada en: ${duration}ms`);
      console.log(`📊 Status Code: ${response.status}`);
      console.log(`📏 Tamaño respuesta: ${JSON.stringify(response.data).length} bytes`);

      if (response.status < 200 || response.status >= 300) {
        console.error(`❌ Error HTTP ${response.status}`);
        console.error(`📄 Respuesta:`, JSON.stringify(response.data, null, 2));
        throw new Error(`HTTP ${response.status}: ${JSON.stringify(response.data)}`);
      }

      const customers = response.data?.value || [];
      console.log(`📊 Registros recibidos: ${customers.length}`);

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
      const duration = Date.now() - startTime;
      console.error('\n❌ ========== ERROR EN CUSTOMERS ==========');
      console.error(`⏱️ Duración antes del error: ${duration}ms`);
      console.error(`❌ Tipo de error: ${error.name}`);
      console.error(`💬 Mensaje: ${error.message}`);

      if (error.response) {
        console.error(`📊 Status Code: ${error.response.status}`);
        console.error(`📄 Respuesta:`, JSON.stringify(error.response.data, null, 2));
        console.error(`📋 Headers:`, JSON.stringify(error.response.headers, null, 2));
      } else if (error.request) {
        console.error('📡 No se recibió respuesta del servidor');
        console.error('🔧 Request headers:', JSON.stringify(error.config?.headers, null, 2));
      } else {
        console.error('⚙️ Error en configuración:', error.message);
      }

      console.error('📚 Stack trace:', error.stack);

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
    const startTime = Date.now();

    try {
      console.log('\n📡 ========== OBTENIENDO SALES ORDERS ==========');
      console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
      console.log(`📍 Modo: ${this.config.authType.toUpperCase()}`);

      // Si el endpoint no requiere company ID, usar directamente /salesOrders
      const useDirectEndpoint = !this.config.companyId || this.config.companyId === '';
      let url;

      if (useDirectEndpoint) {
        url = `${this.config.apiUrl}/salesOrders`;
        console.log('🔗 Usando endpoint directo (sin company ID)');
      } else {
        // OData requiere que el Company ID esté entre comillas simples y URL encoded
        const encodedCompanyId = encodeURIComponent(`'${this.config.companyId}'`);
        url = `${this.config.apiUrl}/companies(${encodedCompanyId})/salesOrders`;
        console.log('🔗 Usando endpoint con company ID');
      }

      console.log(`🌐 URL completa: ${url}`);
      console.log('⏳ Iniciando petición...');

      const response = await axios.get(url, {
        headers: this._getAuthHeaders(accessToken),
        params: { '$top': 100 },
        httpsAgent: httpsAgent, // SSL fix
        timeout: 300000, // 5 minutos
        validateStatus: (status) => status >= 200 && status < 600,
      });

      const duration = Date.now() - startTime;
      console.log(`✅ Petición completada en: ${duration}ms`);
      console.log(`📊 Status Code: ${response.status}`);
      console.log(`📏 Tamaño respuesta: ${JSON.stringify(response.data).length} bytes`);

      if (response.status < 200 || response.status >= 300) {
        console.error(`❌ Error HTTP ${response.status}`);
        console.error(`📄 Respuesta:`, JSON.stringify(response.data, null, 2));
        throw new Error(`HTTP ${response.status}: ${JSON.stringify(response.data)}`);
      }

      const orders = response.data?.value || [];
      console.log(`📊 Registros recibidos: ${orders.length}`);

      return orders;

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error('\n❌ ========== ERROR EN SALES ORDERS ==========');
      console.error(`⏱️ Duración antes del error: ${duration}ms`);
      console.error(`❌ Tipo de error: ${error.name}`);
      console.error(`💬 Mensaje: ${error.message}`);

      if (error.response) {
        console.error(`📊 Status Code: ${error.response.status}`);
        console.error(`📄 Respuesta:`, JSON.stringify(error.response.data, null, 2));
        console.error(`📋 Headers:`, JSON.stringify(error.response.headers, null, 2));
      } else if (error.request) {
        console.error('📡 No se recibió respuesta del servidor');
        console.error('🔧 Request headers:', JSON.stringify(error.config?.headers, null, 2));
      } else {
        console.error('⚙️ Error en configuración:', error.message);
      }

      console.error('📚 Stack trace:', error.stack);

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

  _generateValidJWT(username, basicAuth) {
    // Generar un JWT válido firmado para Business Central modo básico
    const payload = {
      preferred_username: username,
      email: `${username}@businesscentral.local`,
      name: 'Business Central Admin',
      iss: 'BusinessCentral',
      aud: 'DashCore',
      auth_mode: 'basic',
      basic_auth: basicAuth, // Credenciales Basic Auth incluidas en el token
      exp: Math.floor(Date.now() / 1000) + 3600, // Expira en 1 hora
      iat: Math.floor(Date.now() / 1000)
    };

    const secret = process.env.JWT_SECRET || 'dashcore-bc-secret';
    return jwt.sign(payload, secret);
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
