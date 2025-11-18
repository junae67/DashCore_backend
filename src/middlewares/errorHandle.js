/**
 * ARCHIVO: middlewares/errorHandle.js
 * DESCRIPCIÓN: Middleware global para manejo centralizado de errores
 *
 * RESPONSABILIDADES:
 * - Capturar todos los errores no manejados en la aplicación
 * - Formatear respuestas de error consistentes
 * - Registrar errores en consola con timestamp
 * - Ocultar detalles sensibles en producción
 *
 * DEPENDENCIAS:
 * - Ninguna (middleware nativo de Express)
 *
 * RELACIONES:
 * - Registrado globalmente en app.js
 * - Usado por todos los controladores y rutas que generen errores
 * - Diferencia comportamiento entre desarrollo y producción
 *
 * FORMATO DE RESPUESTA:
 * {
 *   status: 'error',
 *   statusCode: 500,
 *   message: 'Error message',
 *   stack: 'stack trace' // solo en desarrollo
 * }
 */

const errorHandler = (err, req, res, next) => {
    // Extraer código de estado (default 500 si no está definido)
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Ocurrio un error Inesperado';

    // Registrar error en consola con timestamp
    console.error(
        `[Error] ${new Date().toISOString()} - ${statusCode} - ${message}`
    );

    // Mostrar stack trace si está disponible
    if(err.stack){
        console.error(err.stack);
    }

    // Enviar respuesta JSON formateada
    res.status(statusCode).json({
        status: 'error',
        statusCode,
        // En producción, ocultar mensaje detallado por seguridad
        message: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : message,
        // Solo incluir stack trace en desarrollo para debugging
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });

};

module.exports = errorHandler;