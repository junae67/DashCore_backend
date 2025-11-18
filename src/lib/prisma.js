/**
 * ARCHIVO: lib/prisma.js
 * DESCRIPCIÓN: Cliente de Prisma ORM para acceso a la base de datos
 *
 * RESPONSABILIDADES:
 * - Crear y exportar una instancia singleton de PrismaClient
 * - Proporcionar acceso a la base de datos para todos los módulos
 *
 * DEPENDENCIAS:
 * - @prisma/client: Cliente ORM generado por Prisma
 *
 * RELACIONES:
 * - Usado por todos los controladores y servicios que requieren acceso a BD
 * - La configuración de la BD está definida en schema.prisma
 * - Es importado por controladores en /controllers para operaciones CRUD
 */

const { PrismaClient } = require('@prisma/client');

// Crear instancia única de PrismaClient para toda la aplicación
const prisma = new PrismaClient();

// Exportar instancia para uso en otros módulos
module.exports = prisma;
