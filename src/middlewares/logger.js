/**
 * ARCHIVO: middlewares/logger.js
 * DESCRIPCIÓN: Middleware de logging HTTP usando Morgan
 *
 * RESPONSABILIDADES:
 * - Registrar todas las peticiones HTTP entrantes
 * - Guardar logs en archivo access.log en la raíz del proyecto
 * - Usar formato 'combined' de Apache para logs detallados
 *
 * DEPENDENCIAS:
 * - morgan: Librería de logging HTTP
 * - fs: Sistema de archivos Node.js
 * - path: Manejo de rutas de archivos
 *
 * RELACIONES:
 * - Registrado globalmente en app.js antes de las rutas
 * - Los logs se guardan en ../../access.log (raíz del proyecto)
 * - Captura información de todas las peticiones a la API
 *
 * FORMATO DE LOG:
 * Apache Combined Log Format incluye:
 * - IP remota
 * - Timestamp
 * - Método HTTP y ruta
 * - Código de estado
 * - User-agent
 */

const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

// Crear stream de escritura para archivo de logs (append mode)
const logStream = fs.createWriteStream(path.join(__dirname, '../../access.log'), { flags: 'a' });

// Configurar morgan con formato 'combined' y stream a archivo
const logger = morgan('combined', { stream: logStream });

module.exports = logger;
