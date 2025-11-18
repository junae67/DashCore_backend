/**
 * ARCHIVO: middlewares/identifyCompany.js
 * DESCRIPCIÓN: Middleware para identificar automáticamente la compañía del usuario
 *
 * RESPONSABILIDADES:
 * - Decodificar JWT del usuario autenticado
 * - Extraer email del token (campo preferred_username)
 * - Identificar dominio corporativo del email
 * - Buscar compañía asociada al dominio en la BD
 * - Adjuntar companyId y erpId al request
 *
 * DEPENDENCIAS:
 * - jsonwebtoken: Para decodificar tokens JWT
 * - ../lib/prisma: Cliente de base de datos
 *
 * RELACIONES:
 * - Usado en rutas que necesitan contexto de compañía
 * - Complementa authMiddleware.js (valida token diferente)
 * - Trabaja con tokens de autenticación OAuth de Dynamics 365
 * - Busca en tablas ERP y Company de la BD
 * - Adjunta req.companyId y req.erpId para controladores
 *
 * FLUJO:
 * 1. Extrae y valida token Bearer
 * 2. Decodifica JWT sin validar firma (solo extrae payload)
 * 3. Obtiene email del campo preferred_username
 * 4. Extrae dominio del email (ej: user@empresa.com -> empresa.com)
 * 5. Busca ERP dynamics365 en BD
 * 6. Busca Company que tenga email con ese dominio
 * 7. Adjunta companyId y erpId a req
 */

const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

module.exports = async function identifyCompany(req, res, next) {
  const authHeader = req.headers.authorization;

  console.log('🧪 Ejecutando identifyCompany para:', req.originalUrl);

  // Validar presencia de token Bearer
  if (!authHeader?.startsWith('Bearer ')) {
    console.warn('⚠️ Token no proporcionado en el middleware identifyCompany');
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  // Extraer token del header
  const token = authHeader.split(' ')[1];
  if (!token) {
    console.warn('⚠️ Token vacío después de dividir el header');
    return res.status(401).json({ error: 'Token inválido' });
  }

  // Decodificar JWT (sin validar firma, solo extraer payload)
  let decoded;
  try {
    decoded = jwt.decode(token);
  } catch (err) {
    console.error('❌ Error al decodificar el token:', err.message);
    return res.status(401).json({ error: 'Token corrupto o ilegible' });
  }

  // Extraer email del token (Dynamics usa preferred_username)
  const email = decoded?.preferred_username;
  if (!email) {
    console.warn('⚠️ Token decodificado pero sin preferred_username');
    return res.status(403).json({ error: 'Token sin correo electrónico válido' });
  }

  // Extraer dominio corporativo del email
  const domain = email.split('@')[1];
  console.log(`🔍 Dominio extraído del email: ${domain}`);

  // Buscar ERP Dynamics 365 en base de datos
  let erp;
  try {
    erp = await prisma.erp.findUnique({ where: { name: 'dynamics365' } });
    if (!erp) throw new Error('ERP no encontrado en la base de datos');
  } catch (e) {
    console.error('❌ Error al buscar ERP:', e.message);
    return res.status(500).json({ error: 'Error interno buscando ERP' });
  }

  // Buscar compañía que tenga email con este dominio
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

  // Adjuntar IDs al request para uso en controladores
  req.companyId = company.id;
  req.erpId = erp.id;

  console.log(`✅ Empresa identificada automáticamente: ${company.name} (ID: ${company.id})`);
  next();
};
