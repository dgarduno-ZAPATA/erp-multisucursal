# Deploy Sandbox

Esta guia deja la app lista para un entorno `sandbox` accesible por gerencia o usuarios piloto, sin tratarlo aun como produccion final.

## Objetivo

- Publicar una URL estable para pruebas reales.
- Mantener base de datos, auth y archivos separados de produccion.
- Reducir riesgo operativo mientras se siguen mejorando modulos.

## Stack recomendado

- Hosting app: Vercel
- Base de datos y auth: Supabase
- Runtime: Next.js 14
- ORM: Prisma + Postgres

## Antes de desplegar

1. Rotar credenciales expuestas del proyecto actual.
2. Crear una base o proyecto de Supabase dedicado a `sandbox`.
3. Preparar datos demo o piloto:
   - sucursales
   - usuarios
   - productos
   - inventario inicial
4. Confirmar que el build local pasa:

```bash
npm run build
```

## Variables requeridas

Usa como base [`.env.example`](/c:/Users/QRSDGONZ/erp-multisucursal/.env.example) o [`.env.sandbox.example`](/c:/Users/QRSDGONZ/erp-multisucursal/.env.sandbox.example).

Variables importantes para `sandbox`:

```env
NEXT_PUBLIC_APP_NAME=ERP Multi-Sucursal
NEXT_PUBLIC_APP_SHORT_NAME=ERP
NEXT_PUBLIC_APP_URL=https://sandbox.tudominio.com
NEXT_PUBLIC_APP_ENV=sandbox
NEXT_PUBLIC_SANDBOX_LABEL=Sandbox Interno
NEXT_PUBLIC_ENABLE_PWA=false

NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key

DATABASE_URL=postgresql://...pooler...
DIRECT_URL=postgresql://...direct...
```

## Recomendacion de ambiente

Para sandbox:

- `NEXT_PUBLIC_APP_ENV=sandbox`
- `NEXT_PUBLIC_SANDBOX_LABEL=Sandbox Interno`
- `NEXT_PUBLIC_ENABLE_PWA=false`

Esto deja:

- badge visible de sandbox en login y topbar
- metadata separada del ambiente final
- `robots noindex`
- service worker apagado para evitar problemas de cache mientras validas el sistema

## Despliegue en Vercel

1. Crear un proyecto nuevo en Vercel apuntando a este repo.
2. Configurar variables de entorno del proyecto usando las del sandbox.
   Tip: puedes copiar casi directo desde [`.env.sandbox.example`](/c:/Users/QRSDGONZ/erp-multisucursal/.env.sandbox.example).
3. Build command:

```bash
npm run build
```

4. Install command:

```bash
npm install
```

Configuracion incluida:

- [`vercel.json`](/c:/Users/QRSDGONZ/erp-multisucursal/vercel.json)

5. Si necesitas correr migraciones en el entorno sandbox, ejecuta:

```bash
npm run prisma:migrate:deploy
```

## Migrations

Antes de abrir sandbox a usuarios:

```bash
npm run prisma:generate
npm run prisma:migrate:deploy
```

Si haces seed manual, correlo contra la base de sandbox, no contra la actual de desarrollo.

## Checklist de salida a sandbox

- [ ] Credenciales rotadas
- [ ] Proyecto Supabase exclusivo para sandbox
- [ ] Variables de entorno cargadas en Vercel
- [ ] `NEXT_PUBLIC_APP_ENV=sandbox`
- [ ] `NEXT_PUBLIC_ENABLE_PWA=false`
- [ ] Migraciones aplicadas
- [ ] Usuarios piloto creados
- [ ] Productos e inventario inicial cargados
- [ ] Login probado
- [ ] Dashboard probado
- [ ] POS probado
- [ ] Inventario probado
- [ ] Faltantes probado
- [ ] Ventas y ticket probado
- [ ] Exportacion Excel/PDF probada

## Validacion post-deploy

Revisar:

- Home/login
- Flujo de autenticacion
- Dashboard
- POS
- Inventario
- Faltantes
- Exportaciones

Healthcheck:

```text
GET /api/health
```

Readiness detallado:

```text
GET /api/health/readiness
```

Este endpoint valida:

- variables criticas
- conexion a base
- ambiente `sandbox`
- modo PWA
- formato de `APP_URL`
- señales basicas de publicacion segura

Debe responder algo como:

```json
{
  "ok": true,
  "environment": "sandbox",
  "database": "up"
}
```

## Riesgos conocidos para sandbox

- Impresion Bluetooth depende del navegador/dispositivo del usuario.
- PWA se deja apagada en sandbox para evitar cache agresivo.
- Aun faltan mejoras funcionales; sandbox no debe anunciarse como version final.

## Lo que yo haria despues

1. Crear seed de sandbox con datos iniciales.
2. Preparar un subdominio propio.
3. Agregar bitacora de cambios por deploy.
4. Crear entorno `production` separado del sandbox.
