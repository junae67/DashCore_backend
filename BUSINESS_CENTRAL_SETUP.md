# 🚀 Guía de Instalación: Business Central en Docker

Esta guía te ayudará a instalar Microsoft Dynamics 365 Business Central en tu máquina local usando Docker.

---

## ✅ Requisitos Previos

- **Sistema Operativo**: Windows 10/11 Pro, Enterprise o Education (64-bit)
- **RAM**: Mínimo 8GB (recomendado 16GB)
- **Disco**: 20GB libres
- **Virtualización**: Habilitada en BIOS

---

## Paso 1: Instalar Docker Desktop

### 1.1 Descargar Docker Desktop

1. Ve a: https://www.docker.com/products/docker-desktop/
2. Haz clic en **"Download for Windows"**
3. Espera a que se descargue `Docker Desktop Installer.exe`

### 1.2 Instalar Docker Desktop

1. Ejecuta `Docker Desktop Installer.exe` **como Administrador**
2. En la instalación, asegúrate de marcar:
   - ✅ **Use WSL 2 instead of Hyper-V** (recomendado)
   - ✅ **Add shortcut to desktop**
3. Haz clic en **"Ok"**
4. Espera a que complete la instalación (~5-10 minutos)
5. Haz clic en **"Close and restart"**

### 1.3 Verificar Instalación

Después de reiniciar:

1. Abre **PowerShell** o **CMD**
2. Ejecuta:
   ```powershell
   docker --version
   ```
3. Deberías ver algo como:
   ```
   Docker version 24.0.6, build ed223bc
   ```

---

## Paso 2: Descargar Business Central

### 2.1 Obtener la Imagen de Business Central

Abre **PowerShell** y ejecuta:

```powershell
docker pull mcr.microsoft.com/businesscentral/onprem:latest
```

Esto descargará la imagen (puede tardar 10-30 minutos dependiendo de tu conexión, son ~10GB).

**Nota**: Si te da error de permisos, ejecuta PowerShell **como Administrador**.

---

## Paso 3: Ejecutar Business Central

### 3.1 Crear y Ejecutar el Contenedor

Copia y pega este comando en PowerShell:

```powershell
docker run `
  -e accept_eula=Y `
  -e accept_outdated=Y `
  -e username=admin `
  -e password=P@ssw0rd `
  -e enableApiServices=Y `
  -p 80:80 `
  -p 443:443 `
  -p 7045-7049:7045-7049 `
  -p 8080:8080 `
  --name bc `
  --restart unless-stopped `
  mcr.microsoft.com/businesscentral/onprem:latest
```

**Explicación de parámetros:**
- `-e accept_eula=Y`: Acepta la licencia
- `-e username=admin`: Usuario administrador
- `-e password=P@ssw0rd`: Contraseña (⚠️ cámbiala en producción)
- `-e enableApiServices=Y`: Habilita las APIs REST
- `-p 7048:7048`: Puerto para las APIs (importante para DashCore)
- `--name bc`: Nombre del contenedor
- `--restart unless-stopped`: Se reinicia automáticamente

### 3.2 Esperar a que Inicie

El contenedor tardará **5-15 minutos** en iniciar la primera vez. Puedes ver el progreso con:

```powershell
docker logs -f bc
```

Espera hasta ver un mensaje como:
```
Ready for connections!
```

Presiona `Ctrl+C` para salir de los logs.

---

## Paso 4: Verificar que Business Central Está Corriendo

### 4.1 Verificar el Contenedor

```powershell
docker ps
```

Deberías ver algo como:
```
CONTAINER ID   IMAGE                                    STATUS         PORTS
abc123def456   mcr.microsoft.com/businesscentral/...   Up 5 minutes   0.0.0.0:7048->7048/tcp
```

### 4.2 Acceder a la Interfaz Web

Abre tu navegador y ve a:

```
http://localhost:80/BC/
```

Deberías ver la página de inicio de Business Central.

**Credenciales:**
- **Usuario**: `admin`
- **Contraseña**: `P@ssw0rd`

### 4.3 Probar la API REST

Abre tu navegador o Postman y ve a:

```
http://localhost:7048/BC/api/v2.0/companies
```

Deberías ver un JSON con la lista de compañías (incluyendo "CRONUS USA, Inc.").

---

## Paso 5: Integrar con DashCore

### 5.1 Verificar Configuración en .env

El archivo `.env` ya debería tener:

```env
BC_API_URL=http://localhost:7048/BC/api/v2.0
BC_USERNAME=admin
BC_PASSWORD=P@ssw0rd
BC_COMPANY_ID=CRONUS USA, Inc.
```

### 5.2 Probar Conexión desde Backend

En la terminal de tu proyecto, ejecuta:

```bash
node scripts/test-businesscentral.js
```

Deberías ver:
```
✅ Conexión exitosa con Business Central
📊 Compañías encontradas: 1
📋 Sales Quotes: XX registros
👥 Customers: XX registros
```

---

## Comandos Útiles de Docker

### Iniciar el Contenedor (si está detenido)
```powershell
docker start bc
```

### Detener el Contenedor
```powershell
docker stop bc
```

### Ver Logs en Tiempo Real
```powershell
docker logs -f bc
```

### Reiniciar el Contenedor
```powershell
docker restart bc
```

### Eliminar el Contenedor (⚠️ CUIDADO - Borra todos los datos)
```powershell
docker stop bc
docker rm bc
```

### Ver Uso de Recursos
```powershell
docker stats bc
```

---

## Solución de Problemas

### Error: "Docker daemon is not running"

**Solución**: Abre Docker Desktop desde el menú Inicio. Espera a que se inicie completamente (ícono verde en la barra de tareas).

### Error: "Port 80 is already in use"

**Solución**: Otro servicio está usando el puerto 80. Cambia el puerto en el comando docker run:

```powershell
-p 8080:80
```

Y accede a: `http://localhost:8080/BC/`

### Error: "This computer doesn't have VT-X/AMD-v enabled"

**Solución**:
1. Reinicia tu PC
2. Entra al BIOS/UEFI (generalmente presionando F2, F10, o Del al iniciar)
3. Busca una opción llamada "Virtualization Technology" o "Intel VT-x" o "AMD-V"
4. Habilítala
5. Guarda y sal

### Business Central tarda mucho en iniciar

**Solución**: Es normal la primera vez. Puede tardar hasta 15 minutos. Verifica los logs con:

```powershell
docker logs -f bc
```

### No puedo acceder a http://localhost:7048

**Solución**:
1. Verifica que el contenedor esté corriendo: `docker ps`
2. Espera 5-10 minutos más
3. Revisa los logs: `docker logs bc`
4. Asegúrate de que el puerto no esté bloqueado por el firewall de Windows

---

## Datos de Demostración

Business Central viene con una base de datos completa de demostración llamada **"CRONUS USA, Inc."** que incluye:

- ✅ **Customers**: ~100 clientes
- ✅ **Sales Quotes**: ~20+ cotizaciones
- ✅ **Sales Orders**: ~50+ órdenes de venta
- ✅ **Items**: ~200+ productos
- ✅ **Vendors**: ~80 proveedores
- ✅ **Purchase Orders**: ~30+ órdenes de compra

¡Muchos más datos que SAP API Hub!

---

## Próximos Pasos

Una vez que Business Central esté corriendo:

1. ✅ Ir a https://www.dashcore.app/erp
2. ✅ Seleccionar **"Microsoft Dynamics 365 Business Central"**
3. ✅ Seleccionar cliente **"Business Central Demo"**
4. ✅ Ver leads, contactos y datos financieros reales

---

## Recursos Adicionales

- 📚 **Documentación Oficial**: https://learn.microsoft.com/en-us/dynamics365/business-central/
- 🐳 **Docker Hub**: https://hub.docker.com/_/microsoft-businesscentral
- 💻 **API Reference**: https://learn.microsoft.com/en-us/dynamics365/business-central/dev-itpro/api-reference/v2.0/

---

**¿Problemas?** Comparte el error y los logs (`docker logs bc`) para ayudarte.

---

Generated by Claude (Backend)
