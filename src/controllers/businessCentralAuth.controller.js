/**
 * ARCHIVO: controllers/businessCentralAuth.controller.js
 * DESCRIPCIÓN: Autenticación directa para Business Central (modo local/básico)
 *
 * RESPONSABILIDADES:
 * - Proporcionar autenticación Basic Auth para Business Central Docker
 * - Generar JWTs firmados que contienen credenciales Basic Auth
 * - Permitir autenticación sin flujo OAuth2 (para desarrollo local)
 * - Crear/actualizar registros de Company y Connector en BD
 * - Soportar modo desarrollo con credenciales del .env
 *
 * DEPENDENCIAS:
 * - @prisma/client: Para guardar tokens y configuración
 * - jsonwebtoken: Para generar JWTs firmados
 *
 * RELACIONES:
 * - Usado por rutas en erp.routes.js
 * - Alternativa a auth.controller.js para BC modo local
 * - Los JWTs generados incluyen credenciales Basic Auth en el payload
 * - BusinessCentralConnector extrae credenciales del JWT
 * - No requiere flujo OAuth2 completo (ideal para desarrollo)
 *
 * ENDPOINTS:
 * - POST /api/erp/businesscentral/auth/direct → directAuth()
 * - GET /api/erp/businesscentral/auth → startDirectAuth()
 *
 * FLUJO DE AUTENTICACIÓN:
 * 1. Usuario envía username/password
 * 2. Backend genera Basic Auth en base64
 * 3. Crea JWT firmado con credenciales incluidas en payload
 * 4. Guarda JWT en tabla Connector
 * 5. Retorna access_token e id_token al frontend
 * 6. En peticiones posteriores, BC connector decodifica JWT y usa Basic Auth
 *
 * FORMATO DEL JWT:
 * {
 *   preferred_username: 'admin',
 *   email: 'admin@businesscentral.local',
 *   auth_mode: 'basic',
 *   basic_auth: 'base64_credentials', ← credenciales incluidas
 *   exp: timestamp
 * }
 *
 * USO:
 * - Desarrollo local con Business Central Docker
 * - Evita configuración compleja de OAuth2
 * - NO usar en producción (credenciales en token)
 */

// src/controllers/businessCentralAuth.controller.js
// Autenticación directa para Business Central (modo local/básico)

const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();

/**
 * Genera un JWT válido para Business Central modo básico
 */
function generateBCJWT(username, basicAuth) {
  const payload = {
    preferred_username: username,
    email: `${username}@businesscentral.local`,
    name: 'Business Central Admin',
    iss: 'BusinessCentral',
    aud: 'DashCore',
    auth_mode: 'basic',
    basic_auth: basicAuth, // Guardamos las credenciales Basic Auth en el token
    exp: Math.floor(Date.now() / 1000) + 3600, // Expira en 1 hora
    iat: Math.floor(Date.now() / 1000)
  };

  // Usamos una secret key para firmar (o 'none' para modo básico)
  const secret = process.env.JWT_SECRET || 'dashcore-bc-secret';
  return jwt.sign(payload, secret);
}

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

    // Generar JWT válido para modo básico
    const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');
    const accessToken = generateBCJWT(username, basicAuth);
    const idToken = generateBCJWT(username, basicAuth); // Mismo payload para ambos

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
          accessToken: accessToken,
          updatedAt: new Date()
        }
      });
    } else {
      // Crear nuevo connector
      connector = await prisma.connector.create({
        data: {
          type: 'businesscentral',
          accessToken: accessToken,
          refreshToken: null,
          expiresAt: new Date(Date.now() + 3600000), // 1 hora
          companyId: company.id,
          erpId: erp.id
        }
      });
    }

    console.log('✅ Autenticación exitosa para Business Central');
    console.log('   Company ID:', company.id);
    console.log('   Connector ID:', connector.id);

    // Retornar tokens JWT válidos para el frontend
    res.json({
      access_token: accessToken,
      id_token: idToken,
      token_type: 'Bearer',
      expires_in: 3600,
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

    // Generar JWT válido
    const basicAuth = Buffer.from(`${username}:${password}`).toString('base64');
    const accessToken = generateBCJWT(username, basicAuth);
    const idToken = generateBCJWT(username, basicAuth);

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
          accessToken: accessToken,
          expiresAt: new Date(Date.now() + 3600000), // 1 hora
          updatedAt: new Date()
        }
      });
    } else {
      connector = await prisma.connector.create({
        data: {
          type: 'businesscentral',
          accessToken: accessToken,
          refreshToken: null,
          expiresAt: new Date(Date.now() + 3600000), // 1 hora
          companyId: company.id,
          erpId: erp.id
        }
      });
    }

    console.log('✅ Credenciales configuradas para BC');

    // Redirigir al frontend con JWT tokens válidos
    const frontendUrl = process.env.NODE_ENV === 'production'
      ? 'https://www.dashcore.app'
      : 'http://localhost:5173';

    const redirectUrl = `${frontendUrl}/inicio?access_token=${accessToken}&id_token=${idToken}&erp=businesscentral`;

    res.redirect(redirectUrl);

  } catch (error) {
    console.error('❌ Error al iniciar autenticación BC:', error);
    res.status(500).json({
      error: 'Error al iniciar autenticación',
      details: error.message
    });
  }
};
