// Script para probar qué datos devuelve SAP API Hub
require('dotenv').config();
const axios = require('axios');

async function testSAPData() {
  const apiHubKey = process.env.SAP_API_HUB_KEY;
  const apiHubUrl = process.env.SAP_API_HUB_URL;

  console.log('🔑 API Hub Key:', apiHubKey ? 'Configurada ✓' : 'FALTA ❌');
  console.log('🌐 API Hub URL:', apiHubUrl);
  console.log('\n--- Probando Leads (Quotations) ---\n');

  try {
    const leadsResponse = await axios.get(`${apiHubUrl}/sap/opu/odata/sap/API_SALES_QUOTATION_SRV/A_SalesQuotation`, {
      headers: {
        'APIKey': apiHubKey,
        'Accept': 'application/json',
      },
      params: {
        '$top': 3,
        '$format': 'json',
      },
    });

    const quotations = leadsResponse.data?.d?.results || [];
    console.log(`📊 Total leads obtenidos: ${quotations.length}`);
    console.log('\n📋 Primer lead (raw SAP data):');
    console.log(JSON.stringify(quotations[0], null, 2));

    console.log('\n📋 Lead transformado para DashCore:');
    const transformed = quotations.map((q) => ({
      OpportunityID: q.SalesQuotation,
      OpportunityName: `Cotización ${q.SalesQuotation}`,
      AccountName: q.SoldToParty || 'Cliente SAP',
      ExpectedRevenue: parseFloat(q.TotalNetAmount || 0),
      Stage: q.OverallSDProcessStatus || 'Open',
      CreationDate: q.CreationDate || new Date().toISOString(),
      fullname: `Cotización ${q.SalesQuotation}`,
      companyname: q.SoldToParty || 'Cliente SAP',
      estimatedvalue: parseFloat(q.TotalNetAmount || 0),
      leadsourcecode: 3,
    }));
    console.log(JSON.stringify(transformed[0], null, 2));

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }

  console.log('\n--- Probando Contacts (Business Partners) ---\n');

  try {
    const contactsResponse = await axios.get(`${apiHubUrl}/sap/opu/odata/sap/API_BUSINESS_PARTNER/A_BusinessPartner`, {
      headers: {
        'APIKey': apiHubKey,
        'Accept': 'application/json',
      },
      params: {
        '$top': 3,
        '$format': 'json',
        '$filter': "BusinessPartnerCategory eq '1'",
      },
    });

    const partners = contactsResponse.data?.d?.results || [];
    console.log(`👥 Total contactos obtenidos: ${partners.length}`);
    console.log('\n📋 Primer contacto (raw SAP data):');
    console.log(JSON.stringify(partners[0], null, 2));

    console.log('\n📋 Contacto transformado para DashCore:');
    const transformed = partners.map((p) => ({
      BusinessPartner: p.BusinessPartner,
      BusinessPartnerFullName: p.BusinessPartnerFullName || p.BusinessPartnerName,
      OrganizationBPName1: p.OrganizationBPName1 || 'SAP Customer',
      BusinessPartnerCategory: p.BusinessPartnerCategory,
      EmailAddress: p.DefaultEmailAddress || `${p.BusinessPartner}@sapcustomer.com`,
      contactid: p.BusinessPartner,
      fullname: p.BusinessPartnerFullName || p.BusinessPartnerName,
      emailaddress1: p.DefaultEmailAddress || `${p.BusinessPartner}@sapcustomer.com`,
      companyname: p.OrganizationBPName1 || 'SAP Customer',
    }));
    console.log(JSON.stringify(transformed[0], null, 2));

  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testSAPData();
