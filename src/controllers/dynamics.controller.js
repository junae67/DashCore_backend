const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GET /dynamics/auth?email=usuario@empresa.com
exports.authDynamics = (req, res) => {
  const userEmail = req.query.email;

  if (!userEmail) {
    return res.status(400).send('Falta el parámetro ?email=usuario@dominio.com');
  }

  console.log('🌐 CLIENT_ID:', process.env.DYNAMICS_CLIENT_ID);
  console.log('🌐 REDIRECT_URI:', process.env.DYNAMICS_REDIRECT_URI);
  console.log('🌐 USER_EMAIL:', userEmail);

  const domain = userEmail.split('@')[1];

  const authorizeUrl = `https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize`;

  const params = new URLSearchParams({
    client_id: process.env.DYNAMICS_CLIENT_ID,
    response_type: 'code',
    redirect_uri: process.env.DYNAMICS_REDIRECT_URI,
    response_mode: 'query',
    scope: `${process.env.DYNAMICS_RESOURCE}/.default offline_access openid profile`,
    login_hint: userEmail,
    domain_hint: domain
  });

  const fullUrl = `${authorizeUrl}?${params.toString()}`;

  console.log('➡ Redirigiendo a:', fullUrl);
  res.redirect(fullUrl);
};

// GET /auth/callback?code=...
exports.authCallback = async (req, res) => {
  console.log('🔧 Código recibido:', req.query.code);
  const code = req.query.code;

  if (!code) {
    return res.status(400).send('Falta el código de autorización ?code=...');
  }

  const tokenUrl = `https://login.microsoftonline.com/organizations/oauth2/v2.0/token`;

  const params = new URLSearchParams({
    client_id: process.env.DYNAMICS_CLIENT_ID,
    scope: `${process.env.DYNAMICS_RESOURCE}/.default offline_access openid profile`,
    code: code,
    redirect_uri: process.env.DYNAMICS_REDIRECT_URI,
    grant_type: 'authorization_code',
    client_secret: process.env.DYNAMICS_CLIENT_SECRET,
  });

  console.log('➡ Intercambiando código por token...');

  try {
    const response = await axios.post(tokenUrl, params);
    const { access_token, refresh_token, expires_in, id_token } = response.data;

    console.log('✔ Token recibido:', { access_token: '***', refresh_token: '***', expires_in });

    // Decodificar el id_token para obtener el tenant_id del usuario logueado
    const jwtPayload = JSON.parse(Buffer.from(id_token.split('.')[1], 'base64').toString());
    const tenantId = jwtPayload.tid;
    const userId = jwtPayload.oid;
    const userEmail = jwtPayload.preferred_username;

    console.log('🔎 User:', userEmail, 'Tenant:', tenantId);

    // Guarda en Prisma en tabla Connector
    await prisma.connector.create({
      data: {
        type: 'dynamics',
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt: new Date(Date.now() + expires_in * 1000),
        companyId: tenantId, // Ahora guardas el tenant como companyId real
        erpId: userId,       // Id del usuario en Azure AD
      },
    });

    console.log('✔ Token guardado en DB con Prisma');
    res.send(`✔ Autenticación exitosa para ${userEmail} (tenant: ${tenantId}). Token guardado.`);
  } catch (error) {
    console.error('❌ Error al obtener el token:', error.response?.data || error.message);
    res.status(500).send('Error al obtener el token');
  }
};
