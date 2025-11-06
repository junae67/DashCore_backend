// Script para probar conexión con Business Central
require('dotenv').config();
const axios = require('axios');

async function testBusinessCentral() {
  console.log('🧪 Probando conexión con Business Central...\n');

  const apiUrl = process.env.BC_API_URL;
  const username = process.env.BC_USERNAME;
  const password = process.env.BC_PASSWORD;
  const companyId = process.env.BC_COMPANY_ID;

  console.log('📋 Configuración:');
  console.log(`   API URL: ${apiUrl}`);
  console.log(`   Username: ${username}`);
  console.log(`   Company: ${companyId}`);
  console.log('');

  // Basic Auth
  const auth = Buffer.from(`${username}:${password}`).toString('base64');
  const headers = {
    'Authorization': `Basic ${auth}`,
    'Accept': 'application/json',
  };

  try {
    // 1. Probar conexión básica
    console.log('1️⃣ Probando conexión básica...');
    const healthResponse = await axios.get(`${apiUrl}/companies`, { headers });
    const companies = healthResponse.data?.value || [];
    console.log(`   ✅ Conexión exitosa!`);
    console.log(`   📊 Compañías encontradas: ${companies.length}`);
    companies.forEach((c, i) => {
      console.log(`      ${i + 1}. ${c.displayName || c.name}`);
    });
    console.log('');

    // 2. Probar Sales Quotes (Leads)
    console.log('2️⃣ Probando Sales Quotes...');
    const quotesResponse = await axios.get(
      `${apiUrl}/companies(${encodeURIComponent(companyId)})/salesQuotes`,
      {
        headers,
        params: { '$top': 5 }
      }
    );
    const quotes = quotesResponse.data?.value || [];
    console.log(`   ✅ Sales Quotes obtenidas: ${quotes.length}`);
    if (quotes.length > 0) {
      console.log(`   📋 Ejemplo:`);
      const q = quotes[0];
      console.log(`      • ${q.number || q.documentNumber} - ${q.customerName}`);
      console.log(`      • Monto: $${q.totalAmountIncludingTax || 0}`);
    }
    console.log('');

    // 3. Probar Customers (Contactos)
    console.log('3️⃣ Probando Customers...');
    const customersResponse = await axios.get(
      `${apiUrl}/companies(${encodeURIComponent(companyId)})/customers`,
      {
        headers,
        params: { '$top': 5 }
      }
    );
    const customers = customersResponse.data?.value || [];
    console.log(`   ✅ Customers obtenidos: ${customers.length}`);
    if (customers.length > 0) {
      console.log(`   📋 Ejemplo:`);
      const c = customers[0];
      console.log(`      • ${c.displayName || c.name}`);
      console.log(`      • Email: ${c.email || 'N/A'}`);
    }
    console.log('');

    // 4. Probar Sales Orders (Finanzas)
    console.log('4️⃣ Probando Sales Orders...');
    const ordersResponse = await axios.get(
      `${apiUrl}/companies(${encodeURIComponent(companyId)})/salesOrders`,
      {
        headers,
        params: { '$top': 5 }
      }
    );
    const orders = ordersResponse.data?.value || [];
    console.log(`   ✅ Sales Orders obtenidas: ${orders.length}`);
    if (orders.length > 0) {
      console.log(`   📋 Ejemplo:`);
      const o = orders[0];
      console.log(`      • ${o.number} - ${o.customerName}`);
      console.log(`      • Monto: $${o.totalAmountIncludingTax || 0}`);
    }
    console.log('');

    // Resumen
    console.log('🎉 ¡TODO FUNCIONA CORRECTAMENTE!');
    console.log('');
    console.log('📊 Resumen de datos disponibles:');
    console.log(`   • Compañías: ${companies.length}`);
    console.log(`   • Sales Quotes: ${quotes.length}`);
    console.log(`   • Customers: ${customers.length}`);
    console.log(`   • Sales Orders: ${orders.length}`);
    console.log('');
    console.log('✅ Business Central está listo para usar con DashCore!');

  } catch (error) {
    console.error('❌ Error al conectar con Business Central:');

    if (error.code === 'ECONNREFUSED') {
      console.error('');
      console.error('🐳 Docker no está corriendo o Business Central no ha iniciado.');
      console.error('');
      console.error('Soluciones:');
      console.error('1. Verifica que Docker Desktop esté corriendo (ícono verde)');
      console.error('2. Verifica que el contenedor esté corriendo: docker ps');
      console.error('3. Espera 5-10 minutos más y vuelve a intentar');
      console.error('4. Revisa los logs: docker logs bc');
    } else if (error.response?.status === 401) {
      console.error('');
      console.error('🔐 Error de autenticación.');
      console.error('');
      console.error('Verifica en .env:');
      console.error('BC_USERNAME=admin');
      console.error('BC_PASSWORD=P@ssw0rd');
    } else if (error.response?.status === 404) {
      console.error('');
      console.error('🔍 Endpoint no encontrado.');
      console.error('');
      console.error('Verifica en .env:');
      console.error('BC_API_URL=http://localhost:7048/BC/api/v2.0');
    } else {
      console.error('');
      console.error('Detalles del error:', error.message);
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Data:', error.response.data);
      }
    }

    process.exit(1);
  }
}

testBusinessCentral();
