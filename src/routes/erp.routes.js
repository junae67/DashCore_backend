/**
 * ARCHIVO: routes/erp.routes.js
 * DESCRIPCIÓN: Definición de rutas para autenticación y operaciones de ERPs
 *
 * RESPONSABILIDADES:
 * - Definir endpoints de autenticación OAuth2 para todos los ERPs
 * - Definir endpoints para obtener datos (leads, contactos, finanzas)
 * - Mantener retrocompatibilidad con rutas legacy de Dynamics
 * - Aplicar middlewares de autenticación donde sea necesario
 *
 * DEPENDENCIAS:
 * - express: Router de Express
 * - ../controllers/auth.controller: OAuth genérico
 * - ../controllers/erp.controller: Operaciones de datos
 * - ../middlewares/authMiddleware: Validación de tokens
 *
 * RELACIONES:
 * - Registrado en app.js como /api/erp
 * - Todas las rutas son relativas a /api/erp/
 * - Middlewares aplicados selectivamente según endpoint
 *
 * ESTRUCTURA DE RUTAS:
 *
 * AUTENTICACIÓN:
 * - GET /api/erp/:erpType/auth → Inicia OAuth2
 * - GET /api/erp/:erpType/callback → Callback OAuth2
 *
 * DATOS (requieren authMiddleware):
 * - GET /api/erp/:erpType/leads → Obtiene leads
 * - GET /api/erp/:erpType/contacts → Obtiene contactos
 * - GET /api/erp/:erpType/finance → Obtiene datos financieros
 *
 * LEGACY (retrocompatibilidad Dynamics):
 * - GET /api/erp/dynamics/auth → Alias de /dynamics365/auth
 * - GET /api/erp/auth/callback → Callback para Dynamics
 * - GET /api/erp/dynamics/leads → Alias de /dynamics365/leads
 * - GET /api/erp/dynamics/contacts → Alias de /dynamics365/contacts
 *
 * ADMINISTRACIÓN:
 * - GET /api/erp/list → Lista ERPs disponibles
 *
 * DEBUG (solo desarrollo):
 * - GET /api/erp/debug/env → Variables de entorno
 */

// src/routes/erp.routes.js
// Rutas para autenticación y datos de ERPs (Multi-ERP)

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

const erpController = require('../controllers/erp.controller');
const authMiddleware = require('../middlewares/authMiddleware');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ========== RETROCOMPATIBILIDAD DYNAMICS (rutas viejas) ==========
// Mantener compatibilidad con la configuración existente de Azure AD
router.get('/dynamics/auth', (req, res) => {
  req.params.erpType = 'dynamics365';
  authController.startOAuth(req, res);
});

router.get('/auth/callback', (req, res) => {
  req.params.erpType = 'dynamics365';
  authController.handleCallback(req, res);
});

router.get('/dynamics/leads', authMiddleware, (req, res) => {
  req.params.erpType = 'dynamics365';
  erpController.getLeads(req, res);
});

router.get('/dynamics/contacts', authMiddleware, (req, res) => {
  req.params.erpType = 'dynamics365';
  erpController.getContacts(req, res);
});

// ========== BUSINESS CENTRAL (Autenticación Directa - Sin OAuth) ==========
// BC no usa OAuth2, usa autenticación directa
router.get('/businesscentral/auth', async (req, res) => {
  try {
    const { getConnector } = require('../connectors');
    const connector = getConnector('businesscentral');
    
    // Usar un email por defecto o de la query
    const email = req.query.email || 'admin@cronus.local';
    
    console.log(`➡️ Autenticación directa para Business Central`);
    console.log(`👤 Email: ${email}`);
    
    // Generar tokens usando el método authenticate del conector
    const tokens = await connector.authenticate(email);
    
    // Buscar el ERP de Business Central
    let erp = await prisma.erp.findUnique({ where: { name: 'businesscentral' } });
    
    if (!erp) {
      erp = await prisma.erp.create({
        data: {
          name: 'businesscentral',
          description: 'Microsoft Dynamics 365 Business Central',
        },
      });
    }
    
    // Buscar o crear Company
    let company = await prisma.company.findFirst({
      where: {
        email: email,
        erpId: erp.id,
      },
    });
    
    if (!company) {
      company = await prisma.company.create({
        data: {
          name: email.split('@')[0],
          email: email,
          erpId: erp.id,
        },
      });
      console.log(`✅ Company creada: ${company.name}`);
    }
    
    // Guardar Connector (token) en la base de datos
    await prisma.connector.create({
      data: {
        type: 'businesscentral',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || null,
        expiresAt: new Date(Date.now() + (tokens.expires_in * 1000)),
        companyId: company.id,
        erpId: erp.id,
      },
    });
    
    console.log(`✅ Connector guardado para Business Central`);
    
    // Redirigir al frontend con tokens
    const frontendUrl = process.env.NODE_ENV === 'production'
      ? 'https://www.dashcore.app'
      : 'http://localhost:5173';
    
    const redirectUrl = `${frontendUrl}/inicio?id_token=${tokens.id_token}&access_token=${tokens.access_token}&erp=businesscentral`;
    
    console.log(`🎉 Redirigiendo al frontend: ${frontendUrl}/inicio?erp=businesscentral`);
    res.redirect(redirectUrl);
    
  } catch (error) {
    console.error('❌ Error en autenticación de Business Central:', error);
    res.status(500).json({ error: error.message });
  }
});


// ========== AUTENTICACIÓN OAUTH2 (Multi-ERP) ==========
// Inicia el flujo OAuth2 para cualquier ERP
router.get('/:erpType/auth', authController.startOAuth);

// Callback de OAuth2 para cualquier ERP
router.get('/:erpType/callback', authController.handleCallback);

// ========== DATOS DE ERPs (Multi-ERP, requieren autenticación) ==========
// Obtiene módulos habilitados para el ERP (configuración dinámica)
router.get('/:erpType/modules', authMiddleware, erpController.getModules);

// Obtiene leads desde el ERP especificado
router.get('/:erpType/leads', authMiddleware, erpController.getLeads);

// Obtiene contactos desde el ERP especificado
router.get('/:erpType/contacts', authMiddleware, erpController.getContacts);

// Obtiene datos financieros desde el ERP especificado
router.get('/:erpType/finance', authMiddleware, erpController.getFinanceData);

// ========== ENDPOINT GENÉRICO (debe ir después de las rutas específicas) ==========
// Obtiene datos de cualquier endpoint personalizado
router.get('/:erpType/:endpoint', authMiddleware, erpController.getGenericData);

// ========== ADMINISTRACIÓN ==========
// Lista todos los ERPs disponibles con sus clientes
router.get('/list', erpController.listErpsWithClients);

// ========== DEBUG (solo desarrollo) ==========
if (process.env.NODE_ENV !== 'production') {
  router.get('/debug/env', (req, res) => {
    res.json({
      DYNAMICS_CLIENT_ID: process.env.DYNAMICS_CLIENT_ID,
      SAP_CLIENT_ID: process.env.SAP_CLIENT_ID,
      NODE_ENV: process.env.NODE_ENV,
    });
  });
}

module.exports = router;
