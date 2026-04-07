import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { spawn } from 'node:child_process'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'

const app = express()

app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 3001
const OPENAIP_API_KEY = process.env.OPENAIP_API_KEY
const CESIUM_API_KEY = process.env.CESIUM_API_KEY

if (!OPENAIP_API_KEY) {
  console.error('Missing OPENAIP_API_KEY in .env')
  process.exit(1)
}

const OPENAIP_BASE_URL = 'https://api.core.openaip.net/api'
const RECORDINGS_TEMP_DIR = path.join(os.tmpdir(), 'gpx-overfly-recordings')

async function ensureRecordingsTempDir() {
  await fs.mkdir(RECORDINGS_TEMP_DIR, { recursive: true })
}

function sanitizeFilename(name = 'gps-overfly.webm') {
  return String(name)
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'gps-overfly.webm'
}

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

async function convertVideoToMp4(inputPath, outputPath) {
  await new Promise((resolve, reject) => {
    const ffmpeg = spawn('ffmpeg', [
      '-y',
      '-i',
      inputPath,
      '-movflags',
      '+faststart',
      '-pix_fmt',
      'yuv420p',
      '-c:v',
      'libx264',
      '-preset',
      'veryfast',
      '-crf',
      '23',
      '-an',
      outputPath
    ])

    let stderr = ''

    ffmpeg.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    ffmpeg.on('error', (error) => {
      reject(error)
    })

    ffmpeg.on('close', (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(stderr || `ffmpeg exited with code ${code}`))
    })
  })
}

app.get('/health', (_req, res) => {
  res.json({ ok: true })
})

app.get('/cesium', (_req, res) => {
  res.json({
    ok: true,
    cesiumApiKey: CESIUM_API_KEY
  })
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

app.post(
  '/api/recordings/convert-to-mp4',
  express.raw({
    type: ['video/webm', 'video/mp4', 'application/octet-stream'],
    limit: '500mb'
  }),
  async (req, res) => {
    let inputPath = null
    let outputPath = null

    try {
      await ensureRecordingsTempDir()

      if (!req.body || !req.body.length) {
        return res.status(400).json({
          error: 'Missing video body'
        })
      }

      const requestedFilename = sanitizeFilename(
        req.query.filename || 'gps-overfly.webm'
      )

      const sourceExt = path.extname(requestedFilename).toLowerCase() || '.webm'
      const baseName = path.basename(requestedFilename, sourceExt) || 'gps-overfly'
      const jobId = crypto.randomUUID()

      inputPath = path.join(RECORDINGS_TEMP_DIR, `${jobId}${sourceExt}`)
      outputPath = path.join(RECORDINGS_TEMP_DIR, `${jobId}.mp4`)

      await fs.writeFile(inputPath, req.body)
      await convertVideoToMp4(inputPath, outputPath)

      const outputBuffer = await fs.readFile(outputPath)
      const downloadName = `${baseName}.mp4`

      res.setHeader('Content-Type', 'video/mp4')
      res.setHeader('Content-Length', String(outputBuffer.length))
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${downloadName}"`
      )

      return res.send(outputBuffer)
    } catch (error) {
      console.error('Recording conversion error:', error)

      const message =
        error?.code === 'ENOENT'
          ? 'ffmpeg not found on server'
          : error?.message || 'Failed to convert recording to MP4'

      return res.status(500).json({
        error: message
      })
    } finally {
      const cleanupTasks = []

      if (inputPath) cleanupTasks.push(fs.rm(inputPath, { force: true }))
      if (outputPath) cleanupTasks.push(fs.rm(outputPath, { force: true }))

      await Promise.allSettled(cleanupTasks)
    }
  }
)

app.listen(PORT, () => {
  console.log(`Backend listening on http://localhost:${PORT}`)
})