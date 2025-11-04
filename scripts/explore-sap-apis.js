// Script para explorar otros endpoints de SAP con más datos
require('dotenv').config();
const axios = require('axios');

async function exploreSAPAPIs() {
  const apiHubKey = process.env.SAP_API_HUB_KEY;
  const apiHubUrl = process.env.SAP_API_HUB_URL;

  console.log('🔍 Explorando APIs de SAP Business Hub...\n');

  // Intentar diferentes endpoints que pueden tener más datos
  const endpoints = [
    {
      name: 'Sales Quotations (actual)',
      url: '/sap/opu/odata/sap/API_SALES_QUOTATION_SRV/A_SalesQuotation',
      description: 'Cotizaciones de ventas'
    },
    {
      name: 'Sales Orders',
      url: '/sap/opu/odata/sap/API_SALES_ORDER_SRV/A_SalesOrder',
      description: 'Órdenes de venta'
    },
    {
      name: 'Business Partners',
      url: '/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner',
      description: 'Socios de negocio'
    },
    {
      name: 'Customers',
      url: '/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_Customer',
      description: 'Clientes'
    },
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`\n📊 Probando: ${endpoint.name}`);
      console.log(`   ${endpoint.description}`);

      const response = await axios.get(`${apiHubUrl}${endpoint.url}`, {
        headers: {
          'APIKey': apiHubKey,
          'Accept': 'application/json',
        },
        params: {
          '$top': 100,
          '$format': 'json',
          '$inlinecount': 'allpages'
        },
      });

      const results = response.data?.d?.results || [];
      const totalCount = response.data?.d?.__count || results.length;

      console.log(`   ✅ Total registros disponibles: ${totalCount}`);
      console.log(`   📦 Registros obtenidos: ${results.length}`);

      if (results.length > 0) {
        console.log(`   📋 Primer registro:`, JSON.stringify(results[0], null, 2).substring(0, 300) + '...');
      }

    } catch (error) {
      console.log(`   ❌ Error: ${error.response?.status || error.message}`);
      if (error.response?.status === 404) {
        console.log(`   ℹ️  Endpoint no disponible en sandbox`);
      }
    }
  }
}

exploreSAPAPIs();
