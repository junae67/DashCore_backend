const prisma = require('../lib/prisma');

exports.receiveFinanceData = async (req, res) => {
  const { type, data } = req.body;

  if (!type || !Array.isArray(data)) {
    return res.status(400).json({ error: 'Tipo inválido o data debe ser un array' });
  }

  try {
    const saved = await prisma.financeData.createMany({
      data: data.map(item => ({
        type,
        payload: item
      }))
    });

    console.log('📦 Datos guardados:', saved);
    res.status(200).json({ message: `Se guardaron ${saved.count} registros` });
  } catch (error) {
    console.error('❌ Error al guardar:', error);
    res.status(500).json({ error: 'Error interno al guardar los datos' });
  }
};
