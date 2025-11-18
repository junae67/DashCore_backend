/**
 * ARCHIVO: server.js
 * DESCRIPCIÓN: Punto de entrada principal de la aplicación DashCore Backend
 *
 * RESPONSABILIDADES:
 * - Cargar variables de entorno desde archivo .env
 * - Iniciar el servidor Express en el puerto especificado
 * - Mostrar logs de configuración para Dynamics 365
 *
 * DEPENDENCIAS:
 * - dotenv: Para cargar variables de entorno
 * - ./app: Importa la aplicación Express configurada
 *
 * RELACIONES:
 * - Es el punto de entrada que ejecuta la app configurada en app.js
 * - Depende de las variables de entorno para la configuración de Dynamics 365
 */

// ✅ Asegurarte que esto siempre esté al tope
// Carga las variables de entorno desde el archivo .env
require('dotenv').config();

// Importa la aplicación Express ya configurada con middlewares y rutas
const app = require('./app'); // Acá usás la app ya configurada

// Define el puerto del servidor (usa variable de entorno o 3000 por defecto)
const PORT = process.env.PORT || 3000;

// Inicia el servidor y muestra información de configuración
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  // Muestra las credenciales de Dynamics 365 para debug
  console.log('🔑 DYNAMICS_CLIENT_ID:', process.env.DYNAMICS_CLIENT_ID);
  console.log('🔑 DYNAMICS_TENANT_ID:', process.env.DYNAMICS_TENANT_ID);
  console.log('🔑 DYNAMICS_REDIRECT_URI:', process.env.DYNAMICS_REDIRECT_URI);
  console.log('🔑 DYNAMICS_RESOURCE:', process.env.DYNAMICS_RESOURCE);
});
