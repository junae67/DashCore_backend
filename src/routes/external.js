/**
 * ARCHIVO: routes/external.js
 * DESCRIPCIÓN: Rutas para recibir y consultar datos financieros externos
 *
 * RESPONSABILIDADES:
 * - Definir endpoints para recibir datos desde sistemas externos
 * - Definir endpoints para consultar datos almacenados
 * - Aplicar middleware de identificación de compañía
 * - Permitir almacenamiento de datos de múltiples tipos
 *
 * DEPENDENCIAS:
 * - express: Router de Express
 * - ../controllers/externalFinance: Lógica de almacenamiento de datos
 * - ../middlewares/identifyCompany: Extracción de companyId y erpId
 *
 * RELACIONES:
 * - Registrado en app.js como /api
 * - Rutas son relativas a /api/
 * - Usa identifyCompany para contexto de empresa
 * - Guarda datos en tabla FinanceData
 *
 * ESTRUCTURA DE RUTAS:
 *
 * RECEPCIÓN DE DATOS:
 * - POST /api/external/receive-finance-data → Recibe y guarda datos
 *
 * CONSULTA DE DATOS:
 * - GET /api/external/finance-data → Obtiene datos guardados
 *
 * MIDDLEWARES APLICADOS:
 * - identifyCompany: Extrae companyId y erpId del token
 *
 * CASOS DE USO:
 * - Frontend envía snapshot de datos de ERP
 * - Sistema externo sincroniza datos financieros
 * - Almacenar datos para acceso offline
 * - Persistir datos transformados
 *
 * FORMATO ESPERADO (POST):
 * {
 *   type: 'leads' | 'contacts' | 'orders',
 *   data: [{...}, {...}],
 *   companyId: 'uuid' (opcional, se toma del middleware),
 *   erpId: 'uuid' (opcional, se toma del middleware)
 * }
 */

const express = require('express');
const router = express.Router();
const externalFinanceController = require('../controllers/externalFinance');
const identifyCompany = require('../middlewares/identifyCompany');

// Middleware solo se activa si el token está presente (prueba sin forzarlo)
router.post('/external/receive-finance-data',
  identifyCompany,
  externalFinanceController.receiveFinanceData
);

router.get('/external/finance-data', identifyCompany, externalFinanceController.getFinanceData);


module.exports = router;
