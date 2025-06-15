const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

module.exports = async function identifyCompany(req, res, next) {
  const authHeader = req.headers.authorization;

  console.log('🧪 Ejecutando identifyCompany para:', req.originalUrl);


  if (!authHeader?.startsWith('Bearer ')) {
    console.warn('⚠️ Token no proporcionado en el middleware identifyCompany');
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    console.warn('⚠️ Token vacío después de dividir el header');
    return res.status(401).json({ error: 'Token inválido' });
  }

  let decoded;
  try {
    decoded = jwt.decode(token);
  } catch (err) {
    console.error('❌ Error al decodificar el token:', err.message);
    return res.status(401).json({ error: 'Token corrupto o ilegible' });
  }

  const email = decoded?.preferred_username;
  if (!email) {
    console.warn('⚠️ Token decodificado pero sin preferred_username');
    return res.status(403).json({ error: 'Token sin correo electrónico válido' });
  }

  const domain = email.split('@')[1];
  console.log(`🔍 Dominio extraído del email: ${domain}`);

  let erp;
  try {
    erp = await prisma.erp.findUnique({ where: { name: 'dynamics365' } });
    if (!erp) throw new Error('ERP no encontrado en la base de datos');
  } catch (e) {
    console.error('❌ Error al buscar ERP:', e.message);
    return res.status(500).json({ error: 'Error interno buscando ERP' });
  }

  let company;
  try {
    company = await prisma.company.findFirst({
      where: {
        email: { endsWith: `@${domain}` },
        erpId: erp.id
      }
    });

    if (!company) throw new Error(`No se encontró una compañía con dominio @${domain}`);
  } catch (e) {
    console.error('❌ Error al buscar compañía:', e.message);
    return res.status(404).json({ error: 'Compañía no encontrada o error al buscarla' });
  }

  req.companyId = company.id;
  req.erpId = erp.id;

  console.log(`✅ Empresa identificada automáticamente: ${company.name} (ID: ${company.id})`);
  next();
};
