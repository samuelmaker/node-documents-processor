const { parentPort, workerData } = require('node:worker_threads')
const processRecords = require('./data-processor')

processRecords(workerData.data)
  .then(numProcessed => parentPort.postMessage({ done: true, numProcessed }))
  .catch(() => parentPort.postMessage({ done: false }))
