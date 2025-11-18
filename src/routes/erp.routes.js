/**
 * ARCHIVO: routes/erp.routes.js
 * DESCRIPCIÓN: Definición de rutas para autenticación y operaciones de ERPs
 *
 * RESPONSABILIDADES:
 * - Definir endpoints de autenticación OAuth2 para todos los ERPs
 * - Definir endpoints para obtener datos (leads, contactos, finanzas)
 * - Mantener retrocompatibilidad con rutas legacy de Dynamics
 * - Aplicar middlewares de autenticación donde sea necesario
 * - Gestionar rutas especiales para Business Central (autenticación directa)
 *
 * DEPENDENCIAS:
 * - express: Router de Express
 * - ../controllers/auth.controller: OAuth genérico
 * - ../controllers/businessCentralAuth.controller: Auth directa BC
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
 * - POST /api/erp/businesscentral/auth/direct → Auth directa BC
 * - GET /api/erp/businesscentral/auth → Auth directa BC (GET)
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
 *
 * IMPORTANTE:
 * - Las rutas de Business Central deben ir ANTES de /:erpType
 * - Esto asegura que Express las matchee correctamente
 */

// src/routes/erp.routes.js
// Rutas para autenticación y datos de ERPs (Multi-ERP)

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const bcAuthController = require('../controllers/businessCentralAuth.controller');
const erpController = require('../controllers/erp.controller');
const authMiddleware = require('../middlewares/authMiddleware');

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

// ========== BUSINESS CENTRAL (Autenticación Directa) ==========
// IMPORTANTE: Estas rutas específicas DEBEN ir ANTES de las rutas genéricas /:erpType
// para que Express las matchee correctamente

// POST para autenticación directa (modo básico)
router.post('/businesscentral/auth/direct', bcAuthController.directAuth);

// GET sobrescribe el flujo OAuth para BC y usa autenticación directa
router.get('/businesscentral/auth', bcAuthController.startDirectAuth);

// ========== AUTENTICACIÓN OAUTH2 (Multi-ERP) ==========
// Inicia el flujo OAuth2 para cualquier ERP
router.get('/:erpType/auth', authController.startOAuth);

// Callback de OAuth2 para cualquier ERP
router.get('/:erpType/callback', authController.handleCallback);

// ========== DATOS DE ERPs (Multi-ERP, requieren autenticación) ==========
// Obtiene leads desde el ERP especificado
router.get('/:erpType/leads', authMiddleware, erpController.getLeads);

// Obtiene contactos desde el ERP especificado
router.get('/:erpType/contacts', authMiddleware, erpController.getContacts);

// Obtiene datos financieros desde el ERP especificado
router.get('/:erpType/finance', authMiddleware, erpController.getFinanceData);

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
