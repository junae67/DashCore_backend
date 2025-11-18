/**
 * ARCHIVO: middlewares/authMiddleware.js
 * DESCRIPCIÓN: Middleware de autenticación basado en token Bearer
 *
 * RESPONSABILIDADES:
 * - Validar presencia y formato del token de autenticación
 * - Verificar que el token existe en la base de datos (tabla Connector)
 * - Adjuntar información del conector al objeto request
 * - Bloquear acceso no autorizado
 *
 * DEPENDENCIAS:
 * - @prisma/client: Cliente ORM para consultar base de datos
 *
 * RELACIONES:
 * - Usado en rutas que requieren autenticación ERP
 * - Valida tokens almacenados en tabla Connector de la BD
 * - Los tokens son generados durante el flujo OAuth de ERPs
 * - Adjunta req.connector para uso posterior en controladores
 *
 * FLUJO:
 * 1. Extrae token del header Authorization
 * 2. Busca connector en BD con ese accessToken
 * 3. Si existe, adjunta connector a req y continúa
 * 4. Si no existe, retorna 403 Forbidden
 */

// middlewares/authMiddleware.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = async function (req, res, next) {
  // Verificar que existe header de autorización con formato Bearer
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado' });
  }

  // Extraer token del header
  const token = authHeader.split(' ')[1];

  // Buscar en BD un conector con este accessToken
  const connector = await prisma.connector.findFirst({
    where: { accessToken: token }
  });

  // Si no existe el token en BD, denegar acceso
  if (!connector) {
    return res.status(403).json({ error: 'Token inválido o expirado' });
  }

  // Adjuntar información del conector al request para uso posterior
  req.connector = connector;
  next();
};
