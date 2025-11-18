/**
 * ARCHIVO: routes/erpConfig.routes.js
 * DESCRIPCIÓN: Rutas para gestión de configuración personalizada de ERPs
 *
 * RESPONSABILIDADES:
 * - Definir endpoints para CRUD de configuraciones de ERP
 * - Definir endpoints para gestión de módulos personalizados
 * - Aplicar middlewares de autenticación e identificación de compañía
 * - Permitir personalización de endpoints y mapeos por cliente
 *
 * DEPENDENCIAS:
 * - express: Router de Express
 * - ../controllers/erpConfig.controller: Lógica de configuración
 * - ../middlewares/auth: Validación de tokens (authenticateToken)
 * - ../middlewares/identifyCompany: Extracción de companyId
 *
 * RELACIONES:
 * - Registrado en app.js como /api/config
 * - Todas las rutas son relativas a /api/config/
 * - Requiere autenticación en todas las rutas
 * - Requiere identificación de compañía en todas las rutas
 *
 * ESTRUCTURA DE RUTAS:
 *
 * CONFIGURACIÓN DE ERP:
 * - GET /api/config/erp/:erpType → Obtiene config de ERP
 * - PUT /api/config/erp/:erpType → Actualiza config de ERP
 *
 * MÓDULOS:
 * - GET /api/config/modules → Lista módulos habilitados
 * - PUT /api/config/modules/:moduleId → Actualiza módulo
 *
 * MIDDLEWARES APLICADOS:
 * - authenticateToken: Valida JWT del usuario
 * - identifyCompany: Extrae companyId del token
 *
 * CASOS DE USO:
 * - Cliente A quiere usar 'salesQuotes' para leads
 * - Cliente B quiere usar 'salesOrders' para leads
 * - Personalizar mapeo de campos por cliente
 * - Habilitar/deshabilitar módulos por cliente
 */

// src/routes/erpConfig.routes.js
// Rutas para configuración personalizada de ERPs

const express = require('express');
const router = express.Router();
const erpConfigController = require('../controllers/erpConfig.controller');
const authenticateToken = require('../middlewares/authMiddleware');

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
