import dataGenerator from './data-generator'
import responseProcessor from './response-processor'
import { addLoader, removeLoader } from './loader'

const getNumRecords = () => {
  const numRecordsVal = document.querySelector('#number-records').value
  return !isNaN(numRecordsVal) ? parseInt(numRecordsVal) : 2000
}

const processData = async (elId, data, type) => {
  const SERVER_URL = 'http://127.0.0.1:8094'

  addLoader(elId)

  try {
    const response = await fetch(`${SERVER_URL}/data-processor-${type}`, {
      method: 'POST',
      headers: { 'Content-Type': type === 'buffer' ? 'application/octet-stream' : 'application/json' },
      body: type === 'buffer' ? data : JSON.stringify(data)
    })
    if (!response.ok) throw new Error(`Processing failed (${response.status})`)
    return await response.json()
  } finally {
    removeLoader(elId)
  }
}

window.addEventListener('load', () => {
  document.querySelector('#json-processor-button')
    .addEventListener('click', async () => {
      const elId = 'json-container'

      addLoader(elId, 'Generating data...')

      const data = dataGenerator(getNumRecords())

      removeLoader(elId)

      const responseData = await processData(elId, { data }, 'json')

      responseProcessor(elId, responseData)
    })

  document.querySelector('#buffer-processor-button')
    .addEventListener('click', async () => {
      const elId = 'buffer-container'

      addLoader(elId, 'Generating data...')

      const data = dataGenerator(getNumRecords())

      removeLoader(elId)

      let stringifiedData = '[\n'

      for (let i = 0; i < data.length; i++) {
        stringifiedData += `${JSON.stringify(data[i])}\n`
      }

      stringifiedData += ']'

      const responseData = await processData(elId, stringifiedData, 'buffer')

      responseProcessor(elId, responseData)
    })

  document.querySelector('#threads-processor-button')
    .addEventListener('click', async () => {
      const elId = 'threads-container'

      addLoader(elId, 'Generating data...')

      const data = dataGenerator(getNumRecords())

      removeLoader(elId)

      const numThreadsVal = document.querySelector('#number-threads').value
      const numThreads = !isNaN(numThreadsVal) ? parseInt(numThreadsVal) : 4

      const responseData = await processData(elId, { data, numThreads }, 'threads')

      responseProcessor(elId, responseData)
    })
})
