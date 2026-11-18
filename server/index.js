const express = require('express')
const bodyParser = require('body-parser')
const { Worker } = require('worker_threads')
const server = require('./server')
const dataProcessor = require('./data-processor')

const app = express()

server(app)

app.use(function (req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:8093')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE')
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type')
  res.setHeader('Access-Control-Allow-Credentials', true)

  next()
})

app.use('/data-processor-json', bodyParser.json({ limit: '50mb' }))
app.post('/data-processor-json', async (req, res) => {
  if (!req.body || !Array.isArray(req.body.data) || req.body.data.length === 0) {
    return res.sendStatus(400)
  }

  const startTime = Date.now()

  await dataProcessor(req.body.data)

  res.status(200).send({
    ...process.memoryUsage(),
    endTime: Date.now(),
    startTime
  })
})

app.use('/data-processor-buffer', bodyParser.raw({ limit: '50mb' }))
app.post('/data-processor-buffer', async (req, res) => {
  const startTime = Date.now()
  let numProcessed = 0
  let totalNum = 0
  let finished = false
  let buffer = ''

  req.on('data', async chunk => {
    buffer += chunk.toString()

    const data = buffer.split('\n')

    buffer = data[data.length - 1]
    delete data[data.length - 1]

    totalNum += data.length

    const _numProcessed = await dataProcessor(data)

    numProcessed += _numProcessed

    console.log({ finished, numProcessed, totalNum })

    if (finished && numProcessed === totalNum) {
      res.status(200).send({
        ...process.memoryUsage(),
        endTime: Date.now(),
        startTime
      })
    }
  })

  req.on('end', async () => {
    finished = true

    if (numProcessed === totalNum) {
      res.status(200).send({
        ...process.memoryUsage(),
        endTime: Date.now(),
        startTime
      })
    }
  })
})

app.use('/data-processor-threads', bodyParser.json({ limit: '50mb' }))
app.post('/data-processor-threads', async (req, res) => {
  if (!req.body || !Array.isArray(req.body.data) || req.body.data.length === 0) {
    return res.sendStatus(400)
  }
  if (!Number.isInteger(req.body.numThreads) || req.body.numThreads < 1 || req.body.numThreads > 8) {
    return res.status(400).send({ error: 'numThreads must be an integer between 1 and 8' })
  }

  const startTime = Date.now()
  const numberOfWorkers = req.body.numThreads
  const numberRecordsPerWorker = req.body.data.length / numberOfWorkers
  let workersFinished = 0

  for (let i = 0; i < numberOfWorkers; i++) {
    const start = numberRecordsPerWorker * i
    const end = start + numberRecordsPerWorker + 1

    const w = new Worker(`${__dirname}/worker.js`, {
      workerData: {
        data: req.body.data.slice(start, end)
      }
    })

    w.on('message', message => {
      if (message.done) {
        workersFinished++
      }

      console.log({ message })

      if (workersFinished === numberOfWorkers) {
        res.status(200).send({
          ...process.memoryUsage(),
          endTime: Date.now(),
          startTime
        })
      }
    })
  }
})
