# ☁️ Business Central Cloud - Guía para Clientes Reales

Esta guía explica cómo configurar **Business Central Cloud (Online)** con OAuth2 para clientes reales en producción.

---

## 🔄 Diferencia: Local vs Cloud

| Aspecto | LOCAL (Docker) | CLOUD (Online) |
|---------|----------------|----------------|
| **Para quién** | Desarrolladores | Clientes reales |
| **Autenticación** | Basic Auth (usuario/password) | OAuth2 (Azure AD) |
| **Ubicación** | `localhost:7048` | `api.businesscentral.dynamics.com` |
| **Datos** | Demo (CRONUS) | Reales del cliente |
| **Costo** | Gratis | Requiere licencia BC |
| **Funciona en Railway** | ❌ NO | ✅ SÍ |

---

## 📋 Requisitos Previos

1. Cliente tiene **Business Central Online** (no On-Premise)
2. Cliente tiene **Azure AD** (viene incluido con BC Online)
3. Cliente tiene permisos de administrador

---

## Paso 1: Cliente Registra DashCore en Azure AD

El cliente debe seguir estos pasos:

### 1.1 Ir a Azure Portal

1. Abrir: https://portal.azure.com
2. Ir a **Azure Active Directory**
3. Ir a **App registrations**
4. Clic en **+ New registration**

### 1.2 Configurar la Aplicación

**Nombre**: `DashCore`

**Supported account types**:
- ✅ Accounts in this organizational directory only (Single tenant)

**Redirect URI**:
- Platform: **Web**
- URL: `https://dashcorebackend-production.up.railway.app/api/erp/businesscentral/callback`

Clic en **Register**.

### 1.3 Obtener Client ID y Tenant ID

Después de crear la app, copiar:

- **Application (client) ID**: `abc123...`
- **Directory (tenant) ID**: `xyz789...`

### 1.4 Crear Client Secret

1. Ir a **Certificates & secrets**
2. Clic en **+ New client secret**
3. **Description**: `DashCore Secret`
4. **Expires**: 24 months
5. Clic en **Add**
6. **⚠️ IMPORTANTE**: Copiar el **Value** inmediatamente (solo se muestra una vez)

### 1.5 Configurar API Permissions

1. Ir a **API permissions**
2. Clic en **+ Add a permission**
3. Buscar y seleccionar **Dynamics 365 Business Central**
4. Seleccionar **Delegated permissions**
5. Marcar:
   - ✅ `user_impersonation`
   - ✅ `Financials.ReadWrite.All`
6. Clic en **Add permissions**
7. Clic en **✅ Grant admin consent for [Company]**

---

## Paso 2: Cliente Te Proporciona Credenciales

El cliente debe enviarte:

```
Application (client) ID: abc123-def456-...
Directory (tenant) ID: xyz789-uvw012-...
Client Secret: xxxxxxxxxxxxx
Tenant Name: contoso.onmicrosoft.com
Company Name: Contoso Corporation
```

---

## Paso 3: Configurar en Railway

### 3.1 Ir a Railway Dashboard

1. Abrir: https://railway.app
2. Seleccionar proyecto **DashCore_backend**
3. Ir a **Variables**

### 3.2 Agregar Variables del Cliente

Para el cliente "Contoso", agregar:

```env
# Activar modo OAuth2
CONTOSO_BC_AUTH_TYPE=oauth2

# Credenciales OAuth2
CONTOSO_BC_CLIENT_ID=abc123-def456-...
CONTOSO_BC_CLIENT_SECRET=xxxxxxxxxxxxx
CONTOSO_BC_TENANT_ID=xyz789-uvw012-...
CONTOSO_BC_REDIRECT_URI=https://dashcorebackend-production.up.railway.app/api/erp/businesscentral/callback

# API URL y Company
CONTOSO_BC_API_URL=https://api.businesscentral.dynamics.com/v2.0/contoso.onmicrosoft.com/Production
CONTOSO_BC_COMPANY_ID=Contoso Corporation
```

**Nota**: Prefija las variables con el nombre del cliente (CONTOSO_) para soportar múltiples clientes.

### 3.3 Railway Auto-Deploy

Railway detectará las nuevas variables y hará deploy automáticamente (~2 minutos).

---

## Paso 4: Actualizar Código para Multi-Cliente (Opcional)

Si quieres soportar múltiples clientes simultáneamente, modifica `BusinessCentralConnector.js` para leer variables dinámicamente:

```javascript
constructor(clientPrefix = '') {
  const prefix = clientPrefix ? `${clientPrefix}_` : '';

  super({
    authType: process.env[`${prefix}BC_AUTH_TYPE`] || 'basic',
    clientId: process.env[`${prefix}BC_CLIENT_ID`],
    clientSecret: process.env[`${prefix}BC_CLIENT_SECRET`],
    // ... etc
  });
}
```

**Por ahora**, con un solo cliente, no es necesario. Solo usa las variables sin prefijo.

---

## Paso 5: Probar la Integración

### 5.1 Verificar en DashCore

1. Ve a: https://www.dashcore.app/erp
2. Deberías ver **"Microsoft Dynamics 365 Business Central"**
3. Selecciona el cliente **"Business Central Demo"** (o crea uno nuevo para Contoso)
4. Haz clic en autenticar

### 5.2 Flujo de Autenticación

1. Usuario es redirigido a Microsoft Login
2. Usuario ingresa credenciales de su cuenta de Business Central
3. Azure AD pide consentimiento
4. Usuario acepta permisos
5. Usuario es redirigido de vuelta a DashCore
6. ✅ **¡Autenticado!** Ahora puede ver sus datos reales

---

## 🔍 Verificar que Funciona

### En los Logs de Railway

Deberías ver:

```
🔧 Business Central Connector iniciado en modo: OAUTH2
☁️ Modo CLOUD: Autenticación OAuth2
📡 Obteniendo Sales Quotes desde Business Central (OAUTH2)
✅ 45 registros obtenidos
```

### En DashCore Frontend

- **Leads**: Muestra cotizaciones reales del cliente
- **Contactos**: Muestra clientes reales
- **Finanzas**: Muestra órdenes de venta reales

---

## 🛡️ Seguridad

### Buenas Prácticas:

1. ✅ **Nunca** guardes Client Secrets en el código
2. ✅ Usa variables de entorno de Railway
3. ✅ Rota Client Secrets cada 6-12 meses
4. ✅ Usa HTTPS en todos los endpoints
5. ✅ Valida tokens en cada request

### Permisos Mínimos:

Business Central requiere:
- `user_impersonation` - Para actuar en nombre del usuario
- `Financials.ReadWrite.All` - Para leer/escribir datos financieros

**No solicites más permisos de los necesarios.**

---

## 🚨 Solución de Problemas

### Error: "AADSTS50011: The reply URL specified in the request does not match"

**Solución**: El Redirect URI en Azure AD debe ser **EXACTAMENTE**:
```
https://dashcorebackend-production.up.railway.app/api/erp/businesscentral/callback
```

Verifica que no haya espacios ni trailing slashes.

### Error: "AADSTS65001: The user or administrator has not consented"

**Solución**: El administrador del cliente debe ir a Azure AD → App registrations → DashCore → API permissions → **Grant admin consent**.

### Error: "Unauthorized" al llamar la API

**Solución**: Verifica que:
1. El access_token no haya expirado
2. El scope incluya `https://api.businesscentral.dynamics.com/.default`
3. El usuario tenga permisos en Business Central

### Error: "Company not found"

**Solución**: El `BC_COMPANY_ID` debe coincidir **EXACTAMENTE** con el nombre de la compañía en Business Central (case-sensitive).

Para ver las compañías disponibles:
```
GET https://api.businesscentral.dynamics.com/v2.0/{tenant}/Production/companies
```

---

## 📊 Comparación de Datos

### Local (Docker):
- 📦 ~20 Sales Quotes
- 👥 ~100 Customers
- 💰 ~50 Sales Orders
- **Total**: ~170 registros demo

### Cloud (Cliente Real):
- 📦 Cotizaciones reales del negocio
- 👥 Base de clientes completa
- 💰 Órdenes de venta históricas
- **Total**: Miles de registros reales

---

## 📚 Recursos Adicionales

- **Business Central API Docs**: https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/api-reference/v2.0/
- **Azure AD App Registration**: https://learn.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app
- **OAuth2 Authorization Code Flow**: https://learn.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-auth-code-flow

---

## ✅ Checklist Final

Antes de entregar al cliente:

- [ ] Cliente registró app en Azure AD
- [ ] Client Secret copiado y guardado de forma segura
- [ ] API Permissions configurados y consentidos
- [ ] Redirect URI coincide exactamente
- [ ] Variables agregadas en Railway
- [ ] Deploy exitoso en Railway
- [ ] Prueba de autenticación exitosa
- [ ] Datos reales del cliente visibles en DashCore

---

**¿Dudas?** Consulta los logs de Railway o contacta al equipo de desarrollo.

---

Generated by Claude (Backend)
