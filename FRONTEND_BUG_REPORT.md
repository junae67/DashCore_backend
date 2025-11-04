# 🐛 Bug Report: Frontend falla al cargar datos de SAP

## Estado Actual del Backend
✅ Autenticación OAuth2 de SAP funciona correctamente
✅ Backend redirige a `https://www.dashcore.app/inicio?id_token=XXX&access_token=YYY&erp=sap`
✅ Endpoints de datos SAP funcionan (`/api/erp/sap/leads`, `/api/erp/sap/contacts`)
✅ SAP API Business Hub integrado con datos reales

## Problema en el Frontend

### Síntoma
Después de autenticarse con SAP, el usuario es redirigido a:
```
https://www.dashcore.app/inicio?erp=sap
```

La consola muestra:
```
Tokens capturados desde URL
```

Pero inmediatamente después, la página se queda en blanco con el siguiente error:

```javascript
Uncaught TypeError: Cannot read properties of undefined (reading 'toLowerCase')
    at index-CV6196ns.js:56:17165
    at Array.filter (<anonymous>)
    at index-CV6196ns.js:56:17135
    at Object.Km [as useMemo] (index-CV6196ns.js:48:42697)
    at L_.pt.useMemo (index-CV6196ns.js:17:7379)
    at TM (index-CV6196ns.js:56:17121)
    at Jx (index-CV6196ns.js:73:40558)
    at gu (index-CV6196ns.js:48:34140)
    at Nu (index-CV6196ns.js:48:62254)
    at kg (index-CV6196ns.js:48:72756)
```

### Causa Probable
El código del frontend está intentando hacer `.toLowerCase()` en algún campo que viene como `undefined` desde el backend de SAP. Probablemente en un `useMemo` que filtra o procesa datos.

### ¿Por qué pasa esto?
- Con Microsoft Dynamics 365 funciona perfectamente
- Con SAP BTP falla porque los datos tienen estructura diferente
- Algún campo que Dynamics siempre envía, SAP no lo tiene o viene en formato diferente

---

## Estructura de Datos que Devuelve el Backend

### 1. Lista de ERPs (`GET /api/erp/list`)

```json
[
  {
    "id": "dynamics365",
    "name": "Microsoft Dynamics 365 ERP",
    "clients": [
      {"id": "soft-mas", "name": "soft-mas"}
    ]
  },
  {
    "id": "sap",
    "name": "SAP S/4HANA Cloud",
    "clients": [
      {"id": "sap trial demo", "name": "SAP Trial Demo"},
      {"id": "soft-mas-sap", "name": "soft-mas-sap"}
    ]
  }
]
```

⚠️ **Nota**: El cliente de SAP tiene ID en minúsculas con espacios: `"sap trial demo"`

---

### 2. Leads de SAP (`GET /api/erp/sap/leads`)

**Datos reales de SAP API Business Hub:**

```json
[
  {
    "OpportunityID": "20000000",
    "OpportunityName": "Cotización 20000000",
    "AccountName": "USCU-CUS01",
    "ExpectedRevenue": 123.1,
    "Stage": "Partially processed",
    "CreationDate": "/Date(1473120000000)/",
    "fullname": "Cotización 20000000",
    "companyname": "USCU-CUS01",
    "estimatedvalue": 123.1,
    "leadsourcecode": 3,
    "statuscode": "B",
    "description": "SAP Sales Quotation 20000000"
  },
  {
    "OpportunityID": "20000001",
    "OpportunityName": "Cotización 20000001",
    "AccountName": "USCU-CUS02",
    "ExpectedRevenue": 456.50,
    "Stage": "Completely processed",
    "CreationDate": "/Date(1480464000000)/",
    "fullname": "Cotización 20000001",
    "companyname": "USCU-CUS02",
    "estimatedvalue": 456.50,
    "leadsourcecode": 3,
    "statuscode": "C",
    "description": "SAP Sales Quotation 20000001"
  }
]
```

**Diferencias vs Dynamics:**
- `Stage`: Viene como texto descriptivo (`"Partially processed"`) en lugar de códigos
- `statuscode`: Código de SAP (`"A"`, `"B"`, `"C"`)
- `AccountName`: Viene como códigos SAP (`"USCU-CUS01"`) en lugar de nombres de empresas
- `CreationDate`: Formato OData de SAP (`"/Date(1473120000000)/"`)

---

### 3. Contactos de SAP (`GET /api/erp/sap/contacts`)

**Datos reales de SAP API Business Hub:**

```json
[
  {
    "BusinessPartner": "1000060",
    "BusinessPartnerFullName": "Bill jenson",
    "OrganizationBPName1": "SAP Customer",
    "BusinessPartnerCategory": "1",
    "EmailAddress": "1000060@sapcustomer.com",
    "contactid": "1000060",
    "fullname": "Bill jenson",
    "emailaddress1": "1000060@sapcustomer.com",
    "companyname": "SAP Customer",
    "firstname": "Bill",
    "lastname": "jenson",
    "telephone1": "",
    "description": "SAP Business Partner 1000060"
  },
  {
    "BusinessPartner": "1000061",
    "BusinessPartnerFullName": "John Smith",
    "OrganizationBPName1": "BP02",
    "BusinessPartnerCategory": "1",
    "EmailAddress": "1000061@sapcustomer.com",
    "contactid": "1000061",
    "fullname": "John Smith",
    "emailaddress1": "1000061@sapcustomer.com",
    "companyname": "BP02",
    "firstname": "John",
    "lastname": "Smith",
    "telephone1": "",
    "description": "SAP Business Partner 1000061"
  }
]
```

**Diferencias vs Dynamics:**
- `companyname`: Puede venir como código (`"BP02"`) en lugar de nombre completo
- `OrganizationBPName1`: Puede estar vacío para personas individuales
- Algunos campos pueden venir vacíos (`telephone1`, etc.)

---

## Archivos del Frontend que Probablemente Tienen el Bug

### Archivos Críticos a Revisar:

1. **`SelectClient.tsx`**
   - Procesa la lista de ERPs y clientes
   - Puede estar haciendo `.toLowerCase()` en nombres de clientes o ERPs
   - **Buscar**: Cualquier uso de `.toLowerCase()` sin validar que el valor existe

2. **`leadsDashboard.tsx`**
   - Procesa y filtra datos de leads
   - Usa `useMemo` para filtrar (según el stack trace)
   - **Buscar**: Filtros que usen `.toLowerCase()` en campos como `Stage`, `AccountName`, etc.

3. **`ContactsDashboard.tsx`**
   - Procesa y filtra datos de contactos
   - **Buscar**: Filtros que usen `.toLowerCase()` en campos como `companyname`, `fullname`, etc.

4. **Cualquier componente que procese `erpType`**
   - El parámetro `?erp=sap` puede estar siendo procesado sin validación

---

## Solución Requerida

### Patrón a Buscar (MAL):
```typescript
const filtered = data.filter(item =>
  item.someField.toLowerCase().includes(searchTerm)
);
```

### Patrón Correcto (BIEN):
```typescript
const filtered = data.filter(item =>
  item.someField?.toLowerCase().includes(searchTerm)
);

// O mejor aún:
const filtered = data.filter(item =>
  (item.someField || '').toLowerCase().includes(searchTerm)
);
```

### Campos Específicos a Validar:

**En Leads:**
- `Stage` - Ahora viene como texto largo, no código
- `AccountName` - Puede ser código SAP
- `companyname` - Puede ser código SAP
- Cualquier campo usado en filtros

**En Contactos:**
- `companyname` - Puede ser código corto
- `fullname` - Siempre existe pero validar igual
- `firstname`, `lastname` - Pueden estar vacíos
- Cualquier campo usado en búsquedas

**En Selección de ERP/Cliente:**
- `erpType` o `erp` - Validar que existe antes de usar
- `clientId` o `clientName` - Pueden tener espacios y minúsculas

---

## Datos de Prueba

### Para probar localmente:

**URL después de autenticación:**
```
http://localhost:5173/inicio?id_token=MOCK_TOKEN&access_token=MOCK_TOKEN&erp=sap
```

**Mock de datos SAP (si necesitas):**
```typescript
const mockSAPLeads = [
  {
    OpportunityID: "20000000",
    OpportunityName: "Cotización 20000000",
    AccountName: "USCU-CUS01",
    ExpectedRevenue: 123.1,
    Stage: "Partially processed",
    fullname: "Cotización 20000000",
    companyname: "USCU-CUS01",
    estimatedvalue: 123.1,
    leadsourcecode: 3
  }
];
```

---

## Testing

### Pasos para Reproducir:
1. Ir a https://www.dashcore.app/erp
2. Seleccionar **SAP S/4HANA Cloud**
3. Seleccionar cliente **SAP Trial Demo**
4. Autenticarse con SAP BTP
5. **Error**: Pantalla en blanco, consola muestra `TypeError: Cannot read properties of undefined (reading 'toLowerCase')`

### Comportamiento Esperado:
1. Redirigir a `/inicio?erp=sap` con tokens
2. Mostrar dashboard principal
3. Poder navegar a Leads y ver cotizaciones de SAP
4. Poder navegar a Contactos y ver Business Partners de SAP

---

## Commits Relacionados del Backend

```
3b951ef fix: Mejorar transformación de datos SAP para compatibilidad frontend
26cdda0 debug: Agregar logs detallados para callback OAuth
edd0d8d fix: Manejar caso cuando SAP OAuth no devuelve id_token
363e084 feat: Integrar SAP API Business Hub para datos reales
```

---

## Notas Adicionales

- Microsoft Dynamics 365 sigue funcionando perfectamente
- El problema SOLO ocurre con SAP
- El backend está enviando todos los tokens correctamente
- Los endpoints de datos SAP responden correctamente (probado con Postman)
- El problema es 100% en el frontend al procesar los datos

---

## Prioridad
🔴 **ALTA** - El usuario no puede usar SAP en absolución, la aplicación se rompe completamente.

---

**Generado por**: Claude (Backend)
**Fecha**: 2025-10-30
**Estado Backend**: ✅ Funcionando correctamente
