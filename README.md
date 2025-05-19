# DashCore Backend

Backend para el proyecto DashCore desarrollado con Node.js y Prisma.

## Requisitos

- Node.js
- npm o yarn
- PostgreSQL (o la base de datos configurada en Prisma)

## Instalación

1. Clonar el repositorio
```bash
git clone https://github.com/junae67/DashCore_backend.git
cd DashCore_backend
```

2. Instalar dependencias
```bash
npm install
```

3. Configurar variables de entorno
```bash
cp .env-example .env
# Editar .env con tus configuraciones
```

4. Iniciar el servidor
```bash
npm run dev
```

## Despliegue en Railway

1. Crear una cuenta en [Railway](https://railway.app/)
2. Instalar la CLI de Railway:
```bash
npm i -g @railway/cli
```

3. Iniciar sesión en Railway:
```bash
railway login
```

4. Inicializar el proyecto en Railway:
```bash
railway init
```

5. Desplegar la aplicación:
```bash
railway up
```

## Variables de Entorno en Railway

Asegúrate de configurar las siguientes variables de entorno en el dashboard de Railway:
- `DATABASE_URL`: URL de conexión a la base de datos PostgreSQL
- `PORT`: Puerto en el que se ejecutará la aplicación (Railway lo configurará automáticamente)

## Tecnologías

- Node.js
- Prisma ORM
- PostgreSQL
- TypeScript 