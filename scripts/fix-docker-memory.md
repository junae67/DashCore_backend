# 🔧 Solución: Business Central necesita más memoria

## Problema
Business Central requiere **mínimo 3GB de RAM** para funcionar.

## Solución: Aumentar memoria de Docker Desktop

### Paso 1: Abrir Docker Desktop
1. Haz clic en el ícono de Docker en la bandeja del sistema (abajo a la derecha)
2. Clic en el ícono de **engranaje ⚙️** (Settings)

### Paso 2: Ajustar Memoria
1. Ve a **Resources** → **Advanced** (o **WSL Integration** si usas WSL2)

#### Si usas Hyper-V:
- En **Memory**, ajusta el slider a **mínimo 4GB** (recomendado 6-8GB)
- En **CPUs**, ajusta a mínimo 2 cores

#### Si usas WSL 2:
1. Cierra Docker Desktop
2. Abre PowerShell y ejecuta:
   ```powershell
   notepad $env:USERPROFILE\.wslconfig
   ```
3. Agrega o modifica:
   ```ini
   [wsl2]
   memory=6GB
   processors=4
   ```
4. Guarda y cierra
5. Ejecuta en PowerShell:
   ```powershell
   wsl --shutdown
   ```
6. Reinicia Docker Desktop

### Paso 3: Aplicar cambios
1. Haz clic en **Apply & Restart**
2. Espera a que Docker Desktop se reinicie (~1-2 minutos)

### Paso 4: Reiniciar Business Central
Abre PowerShell y ejecuta:
```powershell
docker start bc
```

Espera 5-10 minutos y verifica:
```powershell
docker ps
```

Deberías ver el contenedor `bc` con estado `Up` y `(healthy)`.

## Verificar que funciona
```powershell
# Ver logs
docker logs -f bc

# Cuando veas "Ready for connections!", presiona Ctrl+C

# Probar la API
curl http://localhost:7048/BC/api/v2.0/companies
```

## Alternativa: Usar Business Central Cloud
Si tu máquina no tiene suficiente RAM, puedes:
1. Usar un **trial de Business Central Cloud** (90 días gratis)
2. Cambiar en `.env`:
   ```env
   BC_AUTH_TYPE=oauth2
   BC_API_URL=https://api.businesscentral.dynamics.com/v2.0/...
   ```

**No necesitarás Docker ni ngrok.**
