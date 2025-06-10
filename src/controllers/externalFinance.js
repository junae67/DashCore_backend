const prisma = require('../lib/prisma');

exports.receiveFinanceData = async (req, res) => {
  const { type, data } = req.body;

  console.log('📥 Simulación de datos de F&O recibidos:', { type, data });

 try {
    await prisma.financeData.create({
      data: {
        type,
        payload: data,
      },
    });

    res.status(200).json({ message: 'Datos guardados correctamente' });
  } catch (error) {
    console.error('❌ Error al guardar datos:', error);
    res.status(500).json({ error: 'Error al guardar datos' });
  }
};