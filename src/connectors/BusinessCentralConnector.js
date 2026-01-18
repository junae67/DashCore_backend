/**
 * ARCHIVO: connectors/BusinessCentralConnector.js
 * DESCRIPCION: Conector para Microsoft Dynamics 365 Business Central
 *
 * RESPONSABILIDADES:
 * - Conectar con la API intermedia de Business Central
 * - Autenticar usuarios (sin OAuth, genera JWT local)
 * - Obtener datos de leads, contactos y finanzas
 * - Leer configuración dinámica desde la BD
 */

const axios = require('axios');
const BaseConnector = require('./BaseConnector');
const ConfigService = require('../services/ConfigService');

class BusinessCentralConnector extends BaseConnector {
  constructor() {
    super({
      name: 'Business Central',
      apiBaseUrl: 'https://api-bc.dashcore.app',
    });
    this.erpType = 'businesscentral';
  }

  getAuthUrl(state = '') {
    return `${this.config.apiBaseUrl}/auth?state=${state}`;
  }

  async authenticate(email) {
    try {
      // Verificar que la API está disponible
      const healthCheck = await axios.get(`${this.config.apiBaseUrl}/health`);

      if (healthCheck.data.status !== 'OK') {
        throw new Error('Business Central API no está disponible');
      }

      // Crear un JWT válido (header.payload.signature)
      const header = Buffer.from(JSON.stringify({
        alg: 'none',
        typ: 'JWT'
      })).toString('base64url');

      const payload = Buffer.from(JSON.stringify({
        email: email,
        iss: 'business-central',
        sub: email,
        name: email.split('@')[0],
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60),
      })).toString('base64url');

      const signature = '';
      const dummyToken = `${header}.${payload}.${signature}`;

      return {
        access_token: dummyToken,
        token_type: 'Bearer',
        expires_in: 31536000,
        id_token: dummyToken,
        refresh_token: dummyToken,
      };
    } catch (error) {
      console.error('Error en authenticate de BC:', error);
      throw new Error(`Error al autenticar con Business Central: ${error.message}`);
    }
  }

  async refreshToken(refreshToken) {
    return {
      access_token: refreshToken,
      expires_in: 31536000,
    };
  }

  /**
   * Obtiene leads/órdenes de venta desde Business Central
   * Lee la configuración de fieldMappings desde la BD
   */
  async getLeads(accessToken, companyId = null) {
    try {
      // Obtener configuración del módulo desde la BD
      const config = await ConfigService.getModuleConfig(this.erpType, 'leads', companyId);

      console.log(`📊 BC getLeads - Endpoint: ${config.endpoint}`);
      console.log(`📊 BC getLeads - FieldMappings:`, config.fieldMappings);

      const response = await axios.get(
        `${this.config.apiBaseUrl}/api/${config.endpoint}`,
        {
          params: { limit: 100 },
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.data.success) {
        throw new Error('Error en respuesta de BC API');
      }

      // DEBUG: Ver estructura real de los datos
      if (response.data.data?.[0]) {
        console.log('📊 Primer registro de BC:', Object.keys(response.data.data[0]));
      }

      // Transformar datos usando el fieldMapping de la BD
      const leads = ConfigService.transformData(
        response.data.data,
        config.fieldMappings,
        {
          description: '',
          source: 'Business Central'
        }
      );

      // Agregar descripción personalizada
      return leads.map(lead => ({
        ...lead,
        description: `Orden ${lead.leadid || 'N/A'}`,
        // Asegurar valores por defecto
        fullname: lead.fullname || 'Sin nombre',
        emailaddress1: lead.emailaddress1 || '',
        estimatedvalue: parseFloat(lead.estimatedvalue) || 0,
        statuscode: lead.statuscode || 'Open'
      }));

    } catch (error) {
      console.error('Error al obtener leads de BC:', error);
      throw new Error(`Error al obtener leads: ${error.message}`);
    }
  }

  /**
   * Obtiene contactos/clientes desde Business Central
   */
  async getContacts(accessToken, companyId = null) {
    try {
      const config = await ConfigService.getModuleConfig(this.erpType, 'contacts', companyId);

      console.log(`📊 BC getContacts - Endpoint: ${config.endpoint}`);

      const response = await axios.get(
        `${this.config.apiBaseUrl}/api/${config.endpoint}`,
        {
          params: { limit: 100 },
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.data.success) {
        throw new Error('Error en respuesta de BC API');
      }

      // Transformar datos usando el fieldMapping de la BD
      const contacts = ConfigService.transformData(
        response.data.data,
        config.fieldMappings,
        { source: 'Business Central' }
      );

      return contacts.map(contact => ({
        ...contact,
        fullname: contact.fullname || 'Sin nombre',
        emailaddress1: contact.emailaddress1 || '',
        telephone1: contact.telephone1 || '',
        parentcustomerid_name: contact.fullname,
        customernumber: contact.contactid
      }));

    } catch (error) {
      console.error('Error al obtener contactos de BC:', error);
      throw new Error(`Error al obtener contactos: ${error.message}`);
    }
  }

  /**
   * Obtiene datos financieros/facturas desde Business Central
   */
  async getFinanceData(accessToken, companyId = null) {
    try {
      const config = await ConfigService.getModuleConfig(this.erpType, 'finance', companyId);

      console.log(`📊 BC getFinanceData - Endpoint: ${config.endpoint}`);

      const response = await axios.get(
        `${this.config.apiBaseUrl}/api/${config.endpoint}`,
        {
          params: { limit: 100 },
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.data.success) {
        throw new Error('Error en respuesta de BC API');
      }

      // Transformar datos usando el fieldMapping de la BD
      const financeData = ConfigService.transformData(
        response.data.data,
        config.fieldMappings,
        { source: 'Business Central' }
      );

      return financeData.map(invoice => ({
        ...invoice,
        totalamount: parseFloat(invoice.totalamount) || 0,
        status: invoice.status || 'Posted',
        documentno: invoice.invoiceid,
        duedate: invoice.duedate || null
      }));

    } catch (error) {
      console.error('Error al obtener finanzas de BC:', error);
      throw new Error(`Error al obtener datos financieros: ${error.message}`);
    }
  }
}

module.exports = BusinessCentralConnector;
