# GPX Overfly Backend

Backend Express che funge da proxy verso la OpenAIP Core API.

Permette di:

- proteggere la API key
- semplificare le chiamate dal frontend
- recuperare dati aeronautici (VFR points, airspaces)

---

## Stack

- Node.js
- Express
- CORS
- dotenv

---

## Requisiti

- Node.js 20+
- API key OpenAIP

---

## Installazione

```bash
npm install
```

---

## Configurazione

Creare un file `.env` nella root del progetto:

```env
PORT=3001
OPENAIP_API_KEY=la-tua-api-key
```

---

## Avvio

### Development

```bash
npm run dev
```

### Production

```bash
npm start
```

Server disponibile su:

```text
http://localhost:3001
```

---

## Endpoint

### Health check

```http
GET /health
```

Response:

```json
{
  "ok": true
}
```

---

### Reporting Points (VFR)

```http
GET /api/reporting-points?bbox=minLon,minLat,maxLon,maxLat
```

Esempio:

```http
GET /api/reporting-points?bbox=9.2,45.1,10.2,45.9
```

---

### Airspaces

```http
GET /api/airspaces?bbox=minLon,minLat,maxLon,maxLat
```

Esempio:

```http
GET /api/airspaces?bbox=9.2,45.1,10.2,45.9
```

---

## Struttura progetto

```text
backend/
  package.json
  server.js
  .env
```

---

## Variabili ambiente

| Variabile        | Descrizione      | Default |
|-----------------|------------------|---------|
| PORT            | Porta server     | 3001    |
| OPENAIP_API_KEY | API key OpenAIP  | -       |

---

## Flusso applicativo

1. Il frontend carica un file GPX
2. Calcola il bounding box
3. Chiama il backend:
   - `/api/reporting-points`
   - `/api/airspaces`
4. Il backend chiama OpenAIP
5. I dati vengono restituiti al frontend
6. Cesium renderizza i risultati

---

## Test rapido

```bash
curl "http://localhost:3001/health"
```

```bash
curl "http://localhost:3001/api/reporting-points?bbox=9.2,45.1,10.2,45.9"
```

```bash
curl "http://localhost:3001/api/airspaces?bbox=9.2,45.1,10.2,45.9"
```

---

## Note

- Backend stateless
- Funziona come proxy verso OpenAIP
- Non esporre mai la API key nel frontend

---

## Roadmap

- caching delle richieste
- filtri per tipo airspace (CTR, TMA, ATZ)
- normalizzazione altitudini
- rate limiting
- logging avanzato

---

## Licenza

MIT
