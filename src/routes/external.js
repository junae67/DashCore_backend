// src/routes/external.routes.js
const express = require('express');
const router = express.Router();
const externalFinanceController = require('../controllers/externalFinance');

router.post('/external/receive-finance-data', externalFinanceController.receiveFinanceData);

module.exports = router;
