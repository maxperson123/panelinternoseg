# ZonaEpic dashboard

Este starter consulta el endpoint autenticado:

- `https://admin.zonaepic.vip/services/report_get_balances_history.php`

La consulta se hace desde un backend local para no exponer el `PHPSESSID` ni el `token` en el navegador.

## Que calcula

- Franja horaria habitual por usuario: `manana`, `tarde` o `noche`
- Monto habitual por usuario segun ticket promedio: `chico`, `mediano` o `grande`
- Inactividad por usuario: `5-9`, `10-14` y `15+` dias sin cargar

## Uso

1. Instala dependencias:

```bash
npm install
```

2. Crea tu `.env` a partir de `.env.example`:

```bash
cp .env.example .env
```

3. Completa al menos:

- `ZONAEPIC_PHPSESSID`
- `ZONAEPIC_USERNAME`

`ZONAEPIC_TOKEN` es opcional. Si lo dejas vacio, el servidor intenta extraerlo desde `report_balances.php` usando tu sesion.

4. Levanta el dashboard:

```bash
npm run dev
```

5. Abre:

```bash
http://localhost:3000
```

## Importante

- Esto no es streaming real. El endpoint que mostraste es HTTP clasico, asi que el "tiempo real" se resuelve con polling cada 10-60 segundos.
- Si la sesion expira, tenes que renovar `PHPSESSID`.
- Si el token cambia y no se puede extraer automaticamente, cargalo manualmente en `.env`.
- El dashboard toma por defecto `30` dias de historial para poder detectar inactividad de `15+` dias.
- La franja horaria se define por la franja donde el usuario mas carga realiza.
- ZonaEpic rompe cuando se pide demasiado volumen en una sola llamada, asi que el backend pagina de a `100` registros.
