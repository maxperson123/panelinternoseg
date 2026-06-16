# Panel Interno Multi-Provider

Dashboard interno para operar y comparar dos paneles distintos dentro de una sola app:

- `ZonaEpic`
- `Zeus`

La app corre con un backend Node simple y una UI web propia.

## Proveedores soportados

### ZonaEpic

Se conecta contra el panel autenticado de ZonaEpic usando:

- `baseUrl`
- `PHPSESSID`
- `token`

El backend refresca el token desde `report_balances.php` y consulta:

- `services/report_get_balances_history.php`

Con esos datos arma:

- usuarios filtrados y totales
- cargas y monto filtrado
- listas de inactividad
- top 100 semanal y mensual

Importante:

- el cache histórico de ZonaEpic se guarda en el navegador
- el cache queda separado por sesión para no mezclar un panel admin con una oficina

### Zeus

Se conecta por login real contra:

- `https://admin.casinozeus.tech/api/backoffice/v1/auth/signin`

Usa:

- `baseUrl`
- `username`
- `password`

Y consulta principalmente:

- `users/me`
- `project/account-transactions`
- `project/account-transactions/total-amount`

Con esos datos arma:

- movimientos del panel madre
- ingresos y egresos
- balance actual
- ranking de días con más ingresos

## Estructura de la app

La interfaz está dividida en 4 secciones:

1. `Inicio`
   - resumen discriminado de ZonaEpic y Zeus
   - comparación rápida entre ambos paneles
2. `ZonaEpic`
   - métricas, filtros, inactividad y rankings
3. `Zeus`
   - movimientos, resumen financiero y top de días
4. `Settings`
   - credenciales de ambos paneles
   - se guardan en el navegador

## Instalación local

1. Instalar dependencias:

```bash
npm install
```

2. Levantar el servidor:

```bash
npm run start
```

3. Abrir:

```bash
http://localhost:3001
```

## Configuración

La app puede tomar defaults desde `.env`, pero la forma principal de uso hoy es cargar credenciales desde `Settings`.

### Variables opcionales para ZonaEpic

Podés usar `.env` para precargar:

- `ZONAEPIC_BASE_URL`
- `ZONAEPIC_PHPSESSID`
- `ZONAEPIC_TOKEN`
- `ZONAEPIC_FULL_IMPORT_START`
- `ZONAEPIC_PAGE_SIZE`
- `ZONAEPIC_WINDOW_MAX_ROWS`

### Variables opcionales para Zeus

Podés usar `.env` para precargar:

- `ZEUS_BASE_URL`
- `ZEUS_USERNAME`
- `ZEUS_PASSWORD`
- `ZEUS_LOOKBACK_DAYS`
- `ZEUS_PAGE_SIZE`

## Scripts

```bash
npm run start
```

Levanta el servidor en modo normal.

```bash
npm run dev
```

Levanta el servidor con `--watch`.

## Deploy

Actualmente está desplegado en Vercel.

Importante:

- `ZonaEpic` puede funcionar en Vercel dependiendo de la sesión cargada
- `Zeus` hoy puede autenticar bien en local pero ser bloqueado con `403` desde Vercel por IP/origen

Por eso, si `Zeus` falla en producción pero anda local:

- no suele ser problema de credenciales
- suele ser bloqueo del origen de la request

## Exportación

La app exporta CSV según la solapa activa:

- `Inicio`
- `ZonaEpic`
- `Zeus`

## Notas operativas

- `.env` no se sube al repo
- `.cache` no se sube al repo
- las credenciales guardadas en `Settings` quedan persistidas en el navegador
- el repo de este proyecto está en:

`https://github.com/maxperson123/panelinternoseg`
