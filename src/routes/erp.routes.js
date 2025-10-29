// src/routes/erp.routes.js
// Rutas para autenticación y datos de ERPs (Multi-ERP)

const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const erpController = require('../controllers/erp.controller');
const authMiddleware = require('../middlewares/authMiddleware');

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
