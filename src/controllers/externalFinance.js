/**
 * ARCHIVO: controllers/externalFinance.js
 * DESCRIPCIÓN: Controlador para recibir y almacenar datos financieros externos
 *
 * RESPONSABILIDADES:
 * - Recibir datos financieros desde sistemas externos o frontend
 * - Validar y guardar datos en tabla FinanceData
 * - Asociar datos con Company y ERP correspondiente
 * - Proporcionar endpoint para consultar datos guardados
 *
 * DEPENDENCIAS:
 * - ../lib/prisma: Cliente de base de datos
 *
 * RELACIONES:
 * - Usado por rutas en external.js
 * - Requiere identifyCompany middleware para req.companyId y req.erpId
 * - Guarda datos en tabla FinanceData
 * - Permite almacenar datos de leads, contactos, órdenes, etc.
 *
 * ENDPOINTS:
 * - POST /api/finance → receiveFinanceData()
 * - GET /api/finance → getFinanceData()
 *
 * FORMATO DE DATOS:
 * {
 *   type: 'leads' | 'contacts' | 'orders' | 'invoices',
 *   data: [array de objetos],
 *   companyId: 'uuid',
 *   erpId: 'uuid'
 * }
 *
 * USO:
 * - Almacenar snapshots de datos de ERPs
 * - Permitir acceso offline a datos
 * - Sincronización de datos desde frontend
 * - Almacenar datos transformados/procesados
 */

// src/controllers/externalFinance.js
const prisma = require('../lib/prisma');

exports.receiveFinanceData = async (req, res) => {
  const { type, data, companyId: bodyCompanyId, erpId: bodyErpId } = req.body;

  // ✅ Agregar lectura desde el middleware
  const companyId = bodyCompanyId || req.headers['x-company-id'] || req.companyId;
  const erpId = bodyCompanyId || req.headers['x-erp-id'] || req.erpId;

  // 🛑 Validación de entrada
  if (!type || !Array.isArray(data)) {
    return res.status(400).json({ error: 'Tipo inválido o data debe ser un array' });
  }

  if (!companyId || !erpId) {
    console.warn('🚫 companyId o erpId faltan', { companyId, erpId });
    return res.status(400).json({ error: 'Faltan companyId o erpId para guardar los datos' });
  }

  try {
    const saved = await prisma.financeData.createMany({
      data: data.map(item => ({
        type,
        payload: item,
        companyId,
        erpId
      }))
    });

    console.log(`📦 Se guardaron ${saved.count} registros para empresa ${companyId} y ERP ${erpId}`);
    res.status(200).json({ message: `Se guardaron ${saved.count} registros` });
  } catch (error) {
    console.error('❌ Error al guardar:', error.response?.data || error.message || error);
    res.status(500).json({ error: 'Error interno al guardar los datos' });
  }
};


exports.getFinanceData = async (req, res) => {
  const companyId = req.companyId;
  const erpId = req.erpId;

  if (!companyId || !erpId) {
    return res.status(400).json({ error: 'Faltan companyId o erpId para obtener los datos' });
  }

  try {
    const data = await prisma.financeData.findMany({
      where: { companyId, erpId },
      orderBy: { createdAt: 'desc' }
    });

    res.json(data);
  } catch (error) {
    console.error('❌ Error al obtener datos financieros:', error.message);
    res.status(500).json({ error: 'Error al obtener los datos financieros' });
  }
};
