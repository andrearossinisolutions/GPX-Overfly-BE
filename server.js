import 'dotenv/config'
import express from 'express'
import cors from 'cors'

const app = express()

app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 3001
const OPENAIP_API_KEY = process.env.OPENAIP_API_KEY

if (!OPENAIP_API_KEY) {
  console.error('Missing OPENAIP_API_KEY in .env')
  process.exit(1)
}

const OPENAIP_BASE_URL = 'https://api.core.openaip.net/api'

function buildQueryString(params) {
  const search = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    search.set(key, String(value))
  }

  return search.toString()
}

async function proxyToOpenAip(path, query = {}) {
  const qs = buildQueryString(query)
  const url = `${OPENAIP_BASE_URL}${path}${qs ? `?${qs}` : ''}`

  const response = await fetch(url, {
    headers: {
      'x-openaip-api-key': OPENAIP_API_KEY,
      Accept: 'application/json'
    }
  })

  const contentType = response.headers.get('content-type') || ''
  const body = contentType.includes('application/json')
    ? await response.json()
    : await response.text()

  return {
    ok: response.ok,
    status: response.status,
    body
  }
}

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

/**
 * Generic passthrough for reporting points.
 * You can pass through filters from the frontend, for example:
 * /api/reporting-points?bbox=minLon,minLat,maxLon,maxLat
 * /api/reporting-points?page=1&limit=100
 *
 * Adjust query params to the exact OpenAIP docs you want to use.
 */
app.get('/api/reporting-points', async (req, res) => {
  try {
    const result = await proxyToOpenAip('/reporting-points', req.query)

    if (!result.ok) {
      return res.status(result.status).json({
        error: 'OpenAIP request failed',
        details: result.body
      })
    }

    return res.json(result.body)
  } catch (error) {
    console.error('Reporting points proxy error:', error)
    return res.status(500).json({
      error: 'Internal server error'
    })
  }
})

app.get('/api/airspaces', async (req, res) => {
  try {
    const result = await proxyToOpenAip('/airspaces', req.query)

    if (!result.ok) {
      return res.status(result.status).json({
        error: 'OpenAIP request failed',
        details: result.body
      })
    }

    return res.json(result.body)
  } catch (error) {
    console.error('Airspaces proxy error:', error)
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    })
  }
})

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`)
})