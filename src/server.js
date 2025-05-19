// ✅ Asegurarte que esto siempre esté al tope
require('dotenv').config(); 

const app = require('./app'); // Acá usás la app ya configurada
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log('🔑 DYNAMICS_CLIENT_ID:', process.env.DYNAMICS_CLIENT_ID);
  console.log('🔑 DYNAMICS_TENANT_ID:', process.env.DYNAMICS_TENANT_ID);
  console.log('🔑 DYNAMICS_REDIRECT_URI:', process.env.DYNAMICS_REDIRECT_URI);
  console.log('🔑 DYNAMICS_RESOURCE:', process.env.DYNAMICS_RESOURCE);
});
