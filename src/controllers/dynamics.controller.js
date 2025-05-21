const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /dynamics/auth?email=usuario@empresa.com
// GET /dynamics/auth
exports.authDynamics = (req, res) => {
  console.log('🌐 CLIENT_ID:', process.env.DYNAMICS_CLIENT_ID);
  console.log('🌐 REDIRECT_URI:', process.env.DYNAMICS_REDIRECT_URI);

  const authorizeUrl = `https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize`;

  const params = new URLSearchParams({
    client_id: process.env.DYNAMICS_CLIENT_ID,
    response_type: 'code',
    redirect_uri: process.env.DYNAMICS_REDIRECT_URI,
    response_mode: 'query',
    scope: `${process.env.DYNAMICS_RESOURCE}/.default offline_access openid profile`
    // 👇 Ya no usamos login_hint ni domain_hint
  });

  const fullUrl = `${authorizeUrl}?${params.toString()}`;
  console.log('➡ Redirigiendo a:', fullUrl);
  res.redirect(fullUrl);
};

// GET /auth/callback?code=...
exports.authCallback = async (req, res) => {
  const code = req.query.code;

  if (!code) {
    return res.status(400).send('Falta el código de autorización ?code=...');
  }

  const tokenUrl = `https://login.microsoftonline.com/organizations/oauth2/v2.0/token`;

  const params = new URLSearchParams({
    client_id: process.env.DYNAMICS_CLIENT_ID,
    scope: `${process.env.DYNAMICS_RESOURCE}/.default offline_access openid profile`,
    code,
    redirect_uri: process.env.DYNAMICS_REDIRECT_URI,
    grant_type: 'authorization_code',
    client_secret: process.env.DYNAMICS_CLIENT_SECRET,
  });

  try {
    // 🔁 Intercambiar código por token
    const response = await axios.post(tokenUrl, params);
    const { access_token, refresh_token, expires_in, id_token } = response.data;

    try {
      const payloadBase64 = id_token.split('.')[1];
      const decodedPayload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf8'));
    
      console.log('📦 Payload del ID Token:', decodedPayload);
    } catch (err) {
      console.error('❌ Error al decodificar el payload del token:', err.message);
    }

    // 🔍 Decodificar ID Token
    const jwtPayload = JSON.parse(Buffer.from(id_token.split('.')[1], 'base64').toString());
    const tenantId = jwtPayload.tid;
    const userId = jwtPayload.oid;
    const userEmail = jwtPayload.preferred_username;
    const companyDomain = userEmail.split('@')[1];

    console.log('👤 Autenticado:', userEmail, 'Tenant:', tenantId);

    // 🛠 Buscar o crear ERP dynamics365
    let erp = await prisma.erp.findUnique({ where: { name: 'dynamics365' } });
    if (!erp) {
      erp = await prisma.erp.create({ data: { name: 'dynamics365', description: 'Microsoft Dynamics 365 ERP' } });
    }

    // 🏢 Buscar o crear Company por dominio
    let company = await prisma.company.findFirst({
      where: {
        email: { endsWith: `@${companyDomain}` },
        erpId: erp.id,
      },
    });

    if (!company) {
      company = await prisma.company.create({
        data: {
          name: companyDomain.split('.')[0],
          email: userEmail,
          erpId: erp.id,
        },
      });
    }

    // 🔐 Guardar el token en tabla Connector
    await prisma.connector.create({
      data: {
        type: 'dynamics',
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: new Date(Date.now() + expires_in * 1000),
        companyId: company.id,
        erpId: erp.id,
      },
    });

    console.log('✅ Token guardado correctamente para', userEmail);
    res.send(`✔ Autenticación exitosa para ${userEmail} (empresa: ${company.name}). Token guardado.`);
  } catch (error) {
    console.error('❌ Error al obtener o guardar el token:', error.response?.data || error.message);
    res.status(500).send('Error al obtener el token');
  }
};
