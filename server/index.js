const express = require('express')
const { Worker } = require('node:worker_threads')
const dataProcessor = require('./data-processor')
const parseRecords = require('./buffer-records')

function createApp ({ processRecords = dataProcessor, bodyLimit = '50mb' } = {}) {
  const app = express()
  app.disable('x-powered-by')
  app.use((req, res, next) => {
    if (['http://localhost:8093', 'http://127.0.0.1:8093'].includes(req.headers.origin)) {
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin)
      res.setHeader('Vary', 'Origin')
    }
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'content-type')
    if (req.method === 'OPTIONS') return res.sendStatus(204)
    next()
  })
  const validRecords = records => Array.isArray(records) && records.length > 0 && records.length <= 100000
  const result = startTime => ({ ...process.memoryUsage(), endTime: Date.now(), startTime })
  app.post('/data-processor-json', express.json({ limit: bodyLimit }), async (req, res, next) => {
    if (!validRecords(req.body?.data)) return res.sendStatus(400)
    const startTime = Date.now()
    try {
      await processRecords(req.body.data)
      res.json(result(startTime))
    } catch (error) { next(error) }
  })
  // Consume once, with the same byte limit for every content type.
  app.post('/data-processor-buffer', express.raw({ type: () => true, limit: bodyLimit, inflate: false }), async (req, res, next) => {
    const startTime = Date.now()
    try {
      const records = parseRecords(req.body)
      if (!validRecords(records)) return res.sendStatus(400)
      await processRecords(records)
      res.json(result(startTime))
    } catch (error) { next(error) }
  })
  app.post('/data-processor-threads', express.json({ limit: bodyLimit }), async (req, res, next) => {
    if (!validRecords(req.body?.data) || !Number.isInteger(req.body.numThreads) || req.body.numThreads < 1 || req.body.numThreads > 8) {
      return res.status(400).json({ error: 'Provide records and an integer numThreads between 1 and 8' })
    }
    const startTime = Date.now()
    const workers = []
    const stop = () => workers.forEach(worker => worker.terminate())
    res.on('close', stop)
    try {
      const size = Math.ceil(req.body.data.length / req.body.numThreads)
      const jobs = []
      for (let start = 0; start < req.body.data.length; start += size) {
        jobs.push(new Promise((resolve, reject) => {
          const worker = new Worker(`${__dirname}/worker.js`, { workerData: { data: req.body.data.slice(start, start + size) } })
          workers.push(worker)
          let replied = false
          worker.once('message', message => {
            replied = true
            if (message.done) resolve(); else reject(new Error('Worker failed'))
          })
          worker.once('error', reject)
          worker.once('exit', code => { if (code !== 0 || !replied) reject(new Error('Worker exited before processing completed')) })
        }))
      }
      await Promise.all(jobs)
      res.json(result(startTime))
    } catch (error) { next(error) } finally {
      res.removeListener('close', stop)
      stop()
    }
  })
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error)
    res.status(error.status || 502).json({ error: error.status === 413 ? 'Request body too large' : error.status === 400 ? 'Invalid request body' : 'Processing failed' })
  })
  return app
}

if (require.main === module) require('./server')(createApp())
module.exports = createApp
