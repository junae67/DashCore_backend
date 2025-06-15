// src/routes/external.routes.js
const express = require('express');
const router = express.Router();
const externalFinanceController = require('../controllers/externalFinance');
const identifyCompany = require('../middlewares/identifyCompany');

router.post(
  '/external/receive-finance-data',
  identifyCompany,
  externalFinanceController.receiveFinanceData
);

module.exports = router;
