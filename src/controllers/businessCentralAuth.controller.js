// src/controllers/businessCentralAuth.controller.js
// Autenticación directa para Business Central (modo local/básico)

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * POST /api/erp/businesscentral/auth/direct
 * Autenticación directa para Business Central modo básico (sin OAuth2)
 *
 * Body: { username, password, apiUrl, companyId }
 */
exports.directAuth = async (req, res) => {
  try {
    const { username, password, apiUrl, companyId } = req.body;

    // Validar campos requeridos
    if (!username || !password) {
      return res.status(400).json({
        error: 'Username y password son requeridos'
      });
    }

    console.log('🔐 Autenticación directa Business Central');
    console.log('   Usuario:', username);
    console.log('   API URL:', apiUrl || process.env.BC_API_URL);

    // Generar token simulado para modo básico
    // En modo básico, el "token" es simplemente las credenciales codificadas
    const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');
    const fakeToken = `basic_${basicAuth}`;

    // Buscar o crear ERP
    let erp = await prisma.erp.findUnique({ where: { name: 'businesscentral' } });
    if (!erp) {
      erp = await prisma.erp.create({
        data: {
          name: 'businesscentral',
          description: 'Microsoft Dynamics 365 Business Central'
        }
      });
    }

    // Buscar o crear Company
    const companyName = companyId || process.env.BC_COMPANY_ID || 'CRONUS USA, Inc.';
    let company = await prisma.company.findFirst({
      where: {
        name: companyName,
        erpId: erp.id
      }
    });

    if (!company) {
      company = await prisma.company.create({
        data: {
          name: companyName,
          email: `admin@${companyName.toLowerCase().replace(/\s/g, '')}.com`,
          erpId: erp.id
        }
      });
    }

    // Buscar o crear Connector
    let connector = await prisma.connector.findFirst({
      where: {
        type: 'businesscentral',
        companyId: company.id
      }
    });

    if (connector) {
      // Actualizar credenciales
      connector = await prisma.connector.update({
        where: { id: connector.id },
        data: {
          accessToken: fakeToken,
          updatedAt: new Date()
        }
      });
    } else {
      // Crear nuevo connector
      connector = await prisma.connector.create({
        data: {
          type: 'businesscentral',
          accessToken: fakeToken,
          refreshToken: null,
          expiresAt: null, // Modo básico no expira
          companyId: company.id,
          erpId: erp.id
        }
      });
    }

    console.log('✅ Autenticación exitosa para Business Central');
    console.log('   Company ID:', company.id);
    console.log('   Connector ID:', connector.id);

    // Retornar tokens para el frontend
    res.json({
      access_token: fakeToken,
      id_token: fakeToken, // Mismo token para ambos en modo básico
      token_type: 'Bearer',
      company: {
        id: company.id,
        name: company.name
      },
      connector: {
        id: connector.id,
        type: 'businesscentral'
      }
    });

  } catch (error) {
    console.error('❌ Error en autenticación directa BC:', error);
    res.status(500).json({
      error: 'Error al autenticar con Business Central',
      details: error.message
    });
  }
};

/**
 * GET /api/erp/businesscentral/auth
 * Redirige al frontend con credenciales por defecto (para desarrollo local)
 */
exports.startDirectAuth = async (req, res) => {
  try {
    console.log('🚀 Iniciando autenticación directa BC (modo desarrollo)');

    // Usar credenciales del .env
    const username = process.env.BC_USERNAME || 'admin';
    const password = process.env.BC_PASSWORD || 'P@ssw0rd';
    const apiUrl = process.env.BC_API_URL;
    const companyId = process.env.BC_COMPANY_ID;

    // Generar token
    const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');
    const fakeToken = `basic_${basicAuth}`;

    // Buscar o crear ERP
    let erp = await prisma.erp.findUnique({ where: { name: 'businesscentral' } });
    if (!erp) {
      erp = await prisma.erp.create({
        data: {
          name: 'businesscentral',
          description: 'Microsoft Dynamics 365 Business Central'
        }
      });
    }

    // Buscar o crear Company
    const companyName = companyId || 'CRONUS USA, Inc.';
    let company = await prisma.company.findFirst({
      where: {
        name: companyName,
        erpId: erp.id
      }
    });

    if (!company) {
      company = await prisma.company.create({
        data: {
          name: companyName,
          email: `admin@${companyName.toLowerCase().replace(/\s/g, '')}.com`,
          erpId: erp.id
        }
      });
    }

    // Buscar o crear Connector
    let connector = await prisma.connector.findFirst({
      where: {
        type: 'businesscentral',
        companyId: company.id
      }
    });

    if (connector) {
      connector = await prisma.connector.update({
        where: { id: connector.id },
        data: {
          accessToken: fakeToken,
          updatedAt: new Date()
        }
      });
    } else {
      connector = await prisma.connector.create({
        data: {
          type: 'businesscentral',
          accessToken: fakeToken,
          refreshToken: null,
          expiresAt: null,
          companyId: company.id,
          erpId: erp.id
        }
      });
    }

    console.log('✅ Credenciales configuradas para BC');

    // Redirigir al frontend con tokens
    const frontendUrl = process.env.NODE_ENV === 'production'
      ? 'https://www.dashcore.app'
      : 'http://localhost:5173';

    const redirectUrl = `${frontendUrl}/inicio?access_token=${fakeToken}&id_token=${fakeToken}&erp=businesscentral`;

    res.redirect(redirectUrl);

  } catch (error) {
    console.error('❌ Error al iniciar autenticación BC:', error);
    res.status(500).json({
      error: 'Error al iniciar autenticación',
      details: error.message
    });
  }
};
