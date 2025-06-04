// middlewares/authMiddleware.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = async function (req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  const token = authHeader.split(' ')[1];
  const connector = await prisma.connector.findFirst({
    where: { accessToken: token }
  });

  if (!connector) {
    return res.status(403).json({ error: 'Token inválido o expirado' });
  }

  // Podés guardar info del usuario si querés
  req.connector = connector;
  next();
};
