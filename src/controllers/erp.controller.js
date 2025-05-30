// controllers/erp.controller.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.listErpsWithClients = async (req, res) => {
  try {
    const erps = await prisma.erp.findMany({
      include: {
        companies: true, // Relación con company
      },
    });

    const result = erps.map((erp) => ({
      id: erp.name.toLowerCase(), // ejemplo: dynamics
      name: erp.name === 'dynamics365' ? 'Microsoft Dynamics 365' : 'SAP ERP',
      clients: erp.companies.map((company) => ({
        id: company.name.toLowerCase(),
        name: company.name,
      })),
    }));

    res.json(result);
  } catch (error) {
    console.error('❌ Error al obtener ERPs y clientes:', error);
    res.status(500).json({ error: 'Error al obtener datos de ERPs' });
  }
};
