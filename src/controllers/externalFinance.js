// src/controllers/externalFinance.js
const prisma = require('../lib/prisma');

exports.receiveFinanceData = async (req, res) => {
  const { type, data, companyId: bodyCompanyId, erpId: bodyErpId } = req.body;

  // Permitir también por headers
  const companyId = bodyCompanyId || req.headers['x-company-id'];
  const erpId = bodyErpId || req.headers['x-erp-id'];

  if (!type || !Array.isArray(data)) {
    return res.status(400).json({ error: 'Tipo inválido o data debe ser un array' });
  }

  if (!companyId || !erpId) {
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

    console.log('📦 Datos guardados:', saved);
    res.status(200).json({ message: `Se guardaron ${saved.count} registros` });
  } catch (error) {
    console.error('❌ Error al guardar:', error.response?.data || error.message || error);
    res.status(500).json({ error: 'Error interno al guardar los datos' });
  }
};
