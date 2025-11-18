/**
 * ARCHIVO: app.js
 * DESCRIPCIÓN: Configuración de la aplicación Express para DashCore Backend
 *
 * RESPONSABILIDADES:
 * - Configurar la aplicación Express con todos los middlewares necesarios
 * - Definir políticas CORS para frontend
 * - Registrar todas las rutas de la API
 * - Configurar manejo de JSON y URL-encoded
 *
 * DEPENDENCIAS:
 * - express: Framework web
 * - cors: Middleware para políticas de origen cruzado
 * - ./middlewares/logger: Middleware de logging de peticiones
 * - ./middlewares/errorHandle: Middleware de manejo de errores
 * - ./routes/*: Módulos de rutas de la API
 *
 * RELACIONES:
 * - Exporta la app configurada que usa server.js
 * - Registra rutas definidas en /routes/erp.routes y /routes/erpConfig.routes
 * - Usa middlewares de /middlewares para logging y manejo de errores
 * - Permite acceso desde frontend en dashcore.app y localhost:5173
 */

// Puedes dejar comentado el dotenv si ya solo trabajas con Railway
// require('dotenv').config();

// Logs de debug para verificar variables de entorno de Dynamics 365
console.log('🔑x DYNAMICS_CLIENT_ID:', process.env.DYNAMICS_CLIENT_ID);
console.log('🔑x DYNAMICS_TENANT_ID:', process.env.DYNAMICS_TENANT_ID);
console.log('🔑x DYNAMICS_REDIRECT_URI:', process.env.DYNAMICS_REDIRECT_URI);
console.log('🔑x DYNAMICS_RESOURCE:', process.env.DYNAMICS_RESOURCE);

const express = require('express');
const app = express();

// Importar middlewares
const logger = require('./middlewares/logger'); // Logging de peticiones HTTP
const errorHandler = require('./middlewares/errorHandle'); // Manejo centralizado de errores

// Importar rutas
const erpRoutes = require('./routes/erp.routes'); // Rutas para conexión con ERPs
const erpConfigRoutes = require('./routes/erpConfig.routes'); // Rutas para configuración de ERPs
const externalRoutes = require('./routes/external'); // Rutas externas/públicas

const cors = require('cors');

// Configuración de orígenes permitidos para CORS
const allowedOrigins = [
    'https://www.dashcore.app', // Frontend en producción
    'http://localhost:5173' // Frontend en desarrollo local
  ];

  // Habilitar CORS con credenciales
  app.use(cors({
    origin: allowedOrigins,
    credentials: true
  }));

// Middlewares globales
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies
app.use(logger); // Registrar todas las peticiones
app.use(errorHandler); // Manejar errores globalmente

// Registrar rutas de la API
app.use('/api', externalRoutes); // Rutas externas/públicas
app.use('/api/erp', erpRoutes); // Rutas para operaciones con ERPs
app.use('/api/config', erpConfigRoutes); // Rutas para configuración de ERPs

// Ruta raíz simple - Landing page del API
app.get('/', (req, res) => {
    res.send(`
        <h1>hello world</h1>
        <p>App con express.js</p>
        <p>PROBANDO123</p>
    `);
});

// Endpoint de health check para monitoreo
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', message: 'Backend is healthy' });
});

// Exportar app configurada para usar en server.js
module.exports = app;
