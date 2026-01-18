
const axios = require('axios');
const BaseConnector = require('./BaseConnector');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class BusinessCentralConnector extends BaseConnector {
  constructor() {
    super({
      name: 'Business Central',
      apiBaseUrl: 'https://api-bc.dashcore.app',
    });
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
    // Header: especifica el algoritmo (none = sin firma)
    const header = Buffer.from(JSON.stringify({
      alg: 'none',
      typ: 'JWT'
    })).toString('base64url');

    // Payload: datos del usuario
    const payload = Buffer.from(JSON.stringify({
      email: email,
      iss: 'business-central',
      sub: email,
      name: email.split('@')[0],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60), // 1 año
    })).toString('base64url');

    // Signature: vacía para JWT sin firma
    const signature = '';

    // Token completo en formato JWT
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

  async getLeads(accessToken, companyId = null) {
    try {
    
      const response = await axios.get(
        `${this.config.apiBaseUrl}/api/salesOrders`,
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

      
      const leads = response.data.data.map(order => ({
        
        leadid: order.Document_No || order.No_,
        fullname: order.Sell_to_Customer_Name || 'Sin nombre',
        companyname: order.Sell_to_Customer_Name,
        emailaddress1: order.Sell_to_E_Mail || '',
        estimatedvalue: parseFloat(order.Amount) || 0,
        createdon: order.Order_Date || order.Document_Date,
        statuscode: order.Status || 'Open',

        
        description: `Orden ${order.Document_No}`,
        source: 'Business Central',
      }));

      return leads;
    } catch (error) {
      console.error('Error al obtener leads de BC:', error);
      throw new Error(`Error al obtener leads: ${error.message}`);
    }
  }

 
   
  async getContacts(accessToken, companyId = null) {
    try {
      const response = await axios.get(
        `${this.config.apiBaseUrl}/api/customers`,
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

    
      const contacts = response.data.data.map(customer => ({
        contactid: customer.No_,
        fullname: customer.Name,
        emailaddress1: customer['E-Mail'] || customer.E_Mail || '',
        telephone1: customer.Phone_No || '',
        address1_city: customer.City || '',
        address1_country: customer.Country_Region_Code || '',
        parentcustomerid_name: customer.Name,

  
        customernumber: customer.No_,
      }));

      return contacts;
    } catch (error) {
      console.error('Error al obtener contactos de BC:', error);
      throw new Error(`Error al obtener contactos: ${error.message}`);
    }
  }

  
  async getFinanceData(accessToken, companyId = null) {
    try {
      const response = await axios.get(
        `${this.config.apiBaseUrl}/api/salesInvoices`,
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

    
      const financeData = response.data.data.map(invoice => ({
        invoiceid: invoice.No_,
        customername: invoice.Sell_to_Customer_Name,
        totalamount: parseFloat(invoice.Amount) || 0,
        createdon: invoice.Posting_Date || invoice.Document_Date,
        status: invoice.Status || 'Posted',

        
        documentno: invoice.No_,
        duedate: invoice.Due_Date,
      }));

      return financeData;
    } catch (error) {
      console.error('Error al obtener finanzas de BC:', error);
      throw new Error(`Error al obtener datos financieros: ${error.message}`);
    }
  }
}

module.exports = BusinessCentralConnector;
