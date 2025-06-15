const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

module.exports = async function identifyCompany(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.decode(token);
    const email = decoded?.preferred_username;
    if (!email) throw new Error('Token sin correo');

    const domain = email.split('@')[1];

    const erp = await prisma.erp.findUnique({ where: { name: 'dynamics365' } });
    if (!erp) throw new Error('ERP no encontrado');

    const company = await prisma.company.findFirst({
      where: {
        email: { endsWith: `@${domain}` },
        erpId: erp.id
      }
    });

    if (!company) throw new Error('Compañía no encontrada');

    req.companyId = company.id;
    req.erpId = erp.id;

    next();
  } catch (err) {
    console.error('❌ Middleware identifyCompany:', err.message);
    return res.status(403).json({ error: 'No se pudo identificar la empresa' });
  }
};
