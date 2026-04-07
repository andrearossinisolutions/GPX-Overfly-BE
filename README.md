# GPX Overfly Backend

Express backend that acts as a proxy to the OpenAIP Core API.

It allows you to:

- protect the API key
- simplify calls from the frontend
- retrieve aeronautical data (VFR points, airspaces)

Use it directly at: <https://gpxoverfly.rossinisolutions.com/>

Feel free to contribute opening a PR!

---

## Stack

- Node.js
- Express
- CORS
- dotenv

---

## Requirements

- Node.js 20+
- OpenAIP API key

---

## Installation

```bash
npm install
```

---

## Configuration

Create an `.env` file in the project root:

```env
PORT=3001
OPENAIP_API_KEY=your-api-key
```

---

## Startup

### Development

```bash
npm run dev
```

### Production

```bash
npm start
```

Server available on:

```text
http://localhost:3001
```

---

## Endpoints

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

Example:

```http
GET /api/reporting-points?bbox=9.2,45.1,10.2,45.9
```

---

### Airspaces

```http
GET /api/airspaces?bbox=minLon,minLat,maxLon,maxLat
```

Example:

```http
GET /api/airspaces?bbox=9.2,45.1,10.2,45.9
```

---

## Project Structure

```text
backend/
package.json
server.js
.env
```

---

## Environment Variables

| Variable | Description | Default |
|-----------------|------------------|--------|
| PORT | Server Port | 3001 |
| OPENAIP_API_KEY | OpenAIP API Key | - |

---

## Application Flow

1. The frontend loads a GPX file
2. Calculates the bounding box
3. Calls the backend:
- `/api/reporting-points`
- `/api/airspaces`
4. The backend calls OpenAIP
5. The data is returned to the frontend
6. Cesium renders the results

---

## Quick Test

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

## Notes

- Stateless backend
- Proxies OpenAIP
- Never expose the API key in the frontend

---

## Roadmap

- Request caching
- Airspace type filters (CTR, TMA, ATZ)
- Altitude normalization
- Rate limiting
- Advanced logging

---

## License

MIT