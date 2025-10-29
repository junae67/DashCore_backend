// src/controllers/auth.controller.js
// Controller genérico para autenticación OAuth2 multi-ERP

const { PrismaClient } = require('@prisma/client');
const { getConnector } = require('../connectors');
const prisma = new PrismaClient();

/**
 * GET /api/erp/:erpType/auth
 * Inicia el flujo OAuth2 redirigiendo al proveedor
 */
exports.startOAuth = (req, res) => {
  const { erpType } = req.params; // 'dynamics365', 'sap', etc.

  try {
    const connector = getConnector(erpType);
    const authUrl = connector.getAuthUrl();

    console.log(`➡️ Iniciando OAuth para ${erpType}`);
    console.log(`🔗 URL de autorización: ${authUrl}`);

    res.redirect(authUrl);
  } catch (error) {
    console.error(`❌ Error al iniciar OAuth para ${erpType}:`, error.message);
    res.status(400).json({ error: error.message });
  }
};

/**
 * GET /api/erp/:erpType/callback
 * Maneja el callback de OAuth2, intercambia código por tokens y guarda en BD
 */
exports.handleCallback = async (req, res) => {
  const { erpType } = req.params;
  const { code } = req.query;

  if (!code) {
    return res.status(400).send('Falta el código de autorización');
  }

  try {
    const connector = getConnector(erpType);

    console.log(`🔄 Procesando callback de ${erpType}`);

    // 1. Intercambiar código por tokens
    const tokens = await connector.authenticate(code);
    const { access_token, refresh_token, expires_in, id_token } = tokens;

    console.log('✅ Tokens obtenidos exitosamente');

    // 2. Decodificar ID token para obtener información del usuario
    const jwtPayload = connector.decodeJWT(id_token);

    // Extraer email del usuario (puede variar según el proveedor)
    const userEmail = jwtPayload.preferred_username || jwtPayload.email || jwtPayload.upn;

    if (!userEmail) {
      throw new Error('No se pudo extraer el email del usuario del token');
    }

    const companyDomain = userEmail.split('@')[1];

    console.log(`👤 Usuario autenticado: ${userEmail}`);
    console.log(`🏢 Dominio de empresa: ${companyDomain}`);

    // 3. Buscar o crear ERP en la base de datos
    let erp = await prisma.erp.findUnique({ where: { name: erpType } });

    if (!erp) {
      erp = await prisma.erp.create({
        data: {
          name: erpType,
          description: `${erpType === 'dynamics365' ? 'Microsoft Dynamics 365' : erpType === 'sap' ? 'SAP S/4HANA Cloud' : erpType.toUpperCase()} ERP`,
        },
      });
      console.log(`✅ ERP creado: ${erp.name}`);
    }

    // 4. Buscar o crear Company
    // Primero intentar buscar por email exacto y erpId
    let company = await prisma.company.findFirst({
      where: {
        email: userEmail,
        erpId: erp.id,
      },
    });

    // Si no existe, buscar por dominio
    if (!company) {
      company = await prisma.company.findFirst({
        where: {
          email: { endsWith: `@${companyDomain}` },
          erpId: erp.id,
        },
      });
    }

    // Si aún no existe, crear nueva company
    if (!company) {
      // Generar email único para evitar conflictos
      const uniqueEmail = `${companyDomain.split('.')[0]}-${erpType}@${companyDomain}`;

      company = await prisma.company.create({
        data: {
          name: `${companyDomain.split('.')[0]}-${erpType}`,
          email: uniqueEmail,
          erpId: erp.id,
        },
      });
      console.log(`✅ Company creada: ${company.name} (${company.email})`);
    } else {
      console.log(`✅ Company encontrada: ${company.name} (${company.email})`);
    }

    // 5. Guardar Connector (token) en la base de datos
    await prisma.connector.create({
      data: {
        type: erpType,
        accessToken: access_token,
        refreshToken: refresh_token || null,
        expiresAt: new Date(Date.now() + (expires_in * 1000)),
        companyId: company.id,
        erpId: erp.id,
      },
    });

    console.log(`✅ Connector guardado para ${company.name} - ${erpType}`);

    // 6. Redirigir al frontend con tokens
    const frontendUrl = process.env.NODE_ENV === 'production'
      ? 'https://www.dashcore.app'
      : 'http://localhost:5173';

    const redirectUrl = `${frontendUrl}/inicio?id_token=${id_token}&access_token=${access_token}&erp=${erpType}`;

    console.log(`🎉 Autenticación exitosa, redirigiendo al frontend`);
    res.redirect(redirectUrl);

  } catch (error) {
    console.error(`❌ Error en callback de ${erpType}:`, error.response?.data || error.message);
    res.status(500).send(`Error al procesar autenticación: ${error.message}`);
  }
};
