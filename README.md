# Robo Directions

Juego 3D para practicar **asking for and giving directions** en inglés (nivel A1–A2).
Robo camina por el pueblo y en cada esquina, paso de cebra o glorieta se detiene y
pregunta qué hacer. El jugador responde en inglés; si acierta, Robo se mueve y vuelve
a preguntar, hasta llegar al destino.

Al terminar, la partida se guarda en el servidor y aparece en un **marcador compartido**
que todos los jugadores ven desde el mismo enlace.

---

## Requisitos

- Node.js 18 o superior. **Sin dependencias** — no hay `npm install`.

## Correr en local

```bash
npm start
# http://localhost:3000
```

Con recarga automática mientras editas:

```bash
npm run dev
```

Los puntajes se guardan en `data/scores.json`. Ese archivo se crea solo.

---

## Estructura

```
server.js                     arranque del servidor HTTP
src/
  config.js                   todo lo que viene de variables de entorno
  routes.js                   tabla de rutas y despacho
  constants/
    scores.constants.js       límites, paginación, retención
  controllers/
    scores.controller.js      request/response, rate limit, códigos HTTP
  services/
    scores.service.js         validación, normalización, orden y agregados
  repositories/
    scores.repository.js      persistencia en JSON (escritura atómica)
  lib/
    http.js                   helpers de JSON, CORS y lectura de body
    rate-limit.js             throttle por IP en memoria
    static.js                 servidor de archivos estáticos
public/
  index.html                  el juego completo (un solo archivo)
data/                         se crea en tiempo de ejecución
```

Tres librerías se cargan desde jsDelivr (three.js, React, ReactDOM). Si necesitas que
funcione sin internet, descárgalas a `public/vendor/` y cambia los tres `<script src>`
al final de `public/index.html`.

---

## API

Base: `/api`

### `GET /api/scores`

Lista de partidas, paginada y con búsqueda.

| Parámetro | Default | Descripción |
|---|---|---|
| `page` | `1` | Página (se recorta al rango válido) |
| `limit` | `20` | Máximo 200 |
| `search` | — | Filtra por nombre del jugador |
| `sort` | `ts` | `ts`, `accuracy`, `mistakes`, `answers`, `seconds` |
| `order` | `desc` | `asc` o `desc` |

```json
{
  "items": [
    {
      "id": "9e99f6bc-…",
      "name": "Laura",
      "answers": 18,
      "correct": 18,
      "mistakes": 0,
      "accuracy": 100,
      "seconds": 80,
      "stops": ["the museum", "the bank", "the cafe"],
      "ts": 1790037919738
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 34,
  "totalPages": 2
}
```

### `POST /api/scores`

Registra una partida. El juego lo llama solo al terminar.

```bash
curl -X POST http://localhost:3000/api/scores \
  -H 'Content-Type: application/json' \
  -d '{"name":"Laura","answers":18,"correct":18,"mistakes":0,"seconds":80,"stops":["the museum"]}'
```

Responde `201` con el registro ya normalizado. Devuelve `400` si falta el nombre y
`429` si esa IP pasó el límite de escrituras.

### `GET /api/leaderboard`

Agregado por jugador, mejor porcentaje primero.

```json
{
  "players": [
    { "name": "Laura", "games": 3, "bestAccuracy": 100, "totalMistakes": 2,
      "totalAnswers": 54, "lastPlayedAt": 1790037919738 }
  ],
  "totalPlayers": 12,
  "totalGames": 34
}
```

### `DELETE /api/scores`

Borra el marcador (útil entre grupos). Si defines `ADMIN_TOKEN`, exige
`Authorization: Bearer <token>`.

```bash
curl -X DELETE http://localhost:3000/api/scores -H "Authorization: Bearer $ADMIN_TOKEN"
```

### `GET /api/health`

`{"ok":true}` — para el health check de la plataforma donde lo despliegues.

---

## Variables de entorno

Copia `.env.example` si tu plataforma las lee desde archivo; si no, defínelas en su panel.

| Variable | Default | Para qué |
|---|---|---|
| `PORT` | `3000` | Puerto |
| `HOST` | `0.0.0.0` | Interfaz |
| `DATA_DIR` | `./data` | Dónde vive `scores.json` |
| `PUBLIC_DIR` | `./public` | Archivos estáticos |
| `CORS_ORIGIN` | `*` | `*` o lista separada por comas |
| `ADMIN_TOKEN` | vacío | Si lo defines, protege el `DELETE` |
| `RATE_WINDOW_MS` | `60000` | Ventana del throttle |
| `RATE_MAX_WRITES` | `30` | Escrituras por IP y ventana |
| `MAX_BODY_BYTES` | `8192` | Tamaño máximo del body |

---

## Desplegar

### Docker (cualquier VPS)

```bash
docker build -t robo-directions .
docker run -d --name robo -p 3000:3000 -v robo-data:/app/data robo-directions
```

El volumen es importante: sin él los puntajes se pierden al recrear el contenedor.

### Render / Railway / Fly

- Build command: *(ninguno)*
- Start command: `node server.js`
- Health check: `/api/health`
- **Monta un disco persistente** y apunta `DATA_DIR` a él (por ejemplo `/data`).
  Sin disco persistente, estas plataformas borran el sistema de archivos en cada
  redeploy y el marcador se vacía.

### VPS con nginx + pm2

```bash
npm install -g pm2
pm2 start server.js --name robo-directions
pm2 save && pm2 startup
```

```nginx
server {
    server_name robo.tudominio.com;
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

Luego `certbot --nginx -d robo.tudominio.com` para el HTTPS.

### Vercel / Netlify — ojo

Sirven el sitio estático sin problema, pero su sistema de archivos es efímero:
`data/scores.json` **no sobrevive**. Si quieres usarlos, cambia
`src/repositories/scores.repository.js` por una implementación contra Vercel KV,
Upstash Redis o Postgres. La interfaz que debe cumplir son tres funciones:
`findAll()`, `insert(record)` y `clear()`. El resto del código no se toca.

---

## Separar el juego del backend

Si prefieres servir el HTML desde un CDN y el API en otro dominio, pon esto
antes del `<script>` principal en `public/index.html`:

```html
<script>window.ROBO_API = "https://api.tudominio.com/api/scores";</script>
```

y define `CORS_ORIGIN` en el servidor con el dominio del sitio.

Si el servidor no responde, el juego **sigue funcionando** y guarda los puntajes en
el `localStorage` del navegador. En ese caso el marcador muestra la etiqueta
*offline — this device only*.
