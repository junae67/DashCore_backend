exports.receiveFinanceData = async (req, res) => {
  const { type, data } = req.body;

  console.log('📥 Simulación de datos de F&O recibidos:', { type, data });

  // Aquí podrías guardar en DB o en memoria (simulado)
  res.status(200).json({ message: 'Datos recibidos correctamente' });
};