// src/routes/erp.routes.js
// Rutas para autenticación y datos de ERPs (Multi-ERP)

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
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
