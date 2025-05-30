// src/routes/erp.routes.js

/*const express = require('express');
const router = express.Router();
const dynamicsController = require('../controllers/dynamics.controller');
const usersController = require('../controllers/users.controller');


router.get('/dynamics/auth', dynamicsController.authDynamics);
router.get('/dynamics/callback', dynamicsController.callbackDynamics);
router.post('/dynamics/form', dynamicsController.formDynamics);
router.post('/dynamics/data', dynamicsController.dataDynamics);

router.get('/dynamics/read', usersController.readDynamics);
router.post('/dynamics/send', usersController.sendDynamics);
router.put('/dynamics/:id', usersController.editDynamics);
router.delete('/dynamics/:id', usersController.deleteDynamics);
router.get('/error-test', (req, res, next) => {
    const error = new Error('Este es un error de prueba');
    error.statusCode = 500;
    next(error);
});*/

const express = require('express');
const router = express.Router();
const dynamicsController = require('../controllers/dynamics.controller');
const erpController = require('../controllers/erp.controller');

// Rutas de Dynamics
router.get('/dynamics/auth', dynamicsController.authDynamics);
router.get('/auth/callback', dynamicsController.authCallback);
router.get('/dynamics/leads', dynamicsController.getDynamicsLeads);
router.get('/list', erpController.listErpsWithClients);

// Ruta de debug correcta dentro del router (así queda bien montada bajo `/api/erp`)
router.get('/debug/env', (req, res) => {
    res.json({
        DYNAMICS_CLIENT_ID: process.env.DYNAMICS_CLIENT_ID,
        DYNAMICS_TENANT_ID: process.env.DYNAMICS_TENANT_ID,
        DYNAMICS_REDIRECT_URI: process.env.DYNAMICS_REDIRECT_URI,
        DYNAMICS_RESOURCE: process.env.DYNAMICS_RESOURCE,
        DYNAMICS_CLIENT_SECRET: process.env.DYNAMICS_CLIENT_SECRET
    });
});

module.exports = router;

