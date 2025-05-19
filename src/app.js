// Puedes dejar comentado el dotenv si ya solo trabajas con Railway
// require('dotenv').config();

console.log('🔑x DYNAMICS_CLIENT_ID:', process.env.DYNAMICS_CLIENT_ID);
console.log('🔑x DYNAMICS_TENANT_ID:', process.env.DYNAMICS_TENANT_ID);
console.log('🔑x DYNAMICS_REDIRECT_URI:', process.env.DYNAMICS_REDIRECT_URI);
console.log('🔑x DYNAMICS_RESOURCE:', process.env.DYNAMICS_RESOURCE);

const express = require('express');
const app = express();
const logger = require('./middlewares/logger');
const errorHandler = require('./middlewares/errorHandle');
const erpRoutes = require('./routes/erp.routes');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(logger);
app.use(errorHandler);

// Todas tus rutas ERP ahora también manejan el debug de env
app.use('/api/erp', erpRoutes);

// Ruta raíz simple
app.get('/', (req, res) => {
    res.send(`
        <h1>hello world</h1>
        <p>App con express.js</p>
        <p>Todo Funciona Correctamente</p>
    `);
});


app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Backend is healthy' });
});

module.exports = app;
