// src/routes/erpConfig.routes.js
// Rutas para configuración personalizada de ERPs

const express = require('express');
const router = express.Router();
const erpConfigController = require('../controllers/erpConfig.controller');
const { authenticateToken } = require('../middlewares/auth');
const { identifyCompany } = require('../middlewares/identifyCompany');

// Middleware: Autenticación y identificación de empresa
router.use(authenticateToken);
router.use(identifyCompany);

// Configuración de ERP
router.get('/erp/:erpType', erpConfigController.getERPConfig);
router.put('/erp/:erpType', erpConfigController.updateERPConfig);

// Módulos
router.get('/modules', erpConfigController.getModules);
router.put('/modules/:moduleId', erpConfigController.updateModule);

module.exports = router;
