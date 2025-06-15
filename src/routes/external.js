const express = require('express');
const router = express.Router();
const externalFinanceController = require('../controllers/externalFinance');
const identifyCompany = require('../middlewares/identifyCompany');

// Middleware solo se activa si el token está presente (prueba sin forzarlo)
router.post('/external/receive-finance-data',
  identifyCompany,
  externalFinanceController.receiveFinanceData
);

module.exports = router;
