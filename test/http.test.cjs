const { test } = require('node:test')
const assert = require('node:assert/strict')
const { once } = require('node:events')
const http = require('node:http')
const createApp = require('../server')

async function serve (t, handler) {
  const server = http.createServer(handler).listen(0, '127.0.0.1')
  await once(server, 'listening')
  t.after(() => new Promise(resolve => server.close(resolve)))
  return `http://127.0.0.1:${server.address().port}`
}

test('buffer endpoint consumes all content types once, returns, and enforces byte limit', async t => {
  const processed = []
  const url = await serve(t, createApp({ bodyLimit: 64, processRecords: async records => processed.push(records) }))
  for (const type of ['application/octet-stream', 'text/plain', 'application/json']) {
    const response = await fetch(`${url}/data-processor-buffer`, {
      method: 'POST', headers: { 'content-type': type }, body: '[\n{"id":1}\n{"id":2}\n]'
    })
    assert.equal(response.status, 200)
    assert.ok((await response.json()).endTime)
  }
  assert.deepEqual(processed, Array.from({ length: 3 }, () => [{ id: 1 }, { id: 2 }]))
  const oversized = await fetch(`${url}/data-processor-buffer`, {
    method: 'POST', headers: { 'content-type': 'text/plain' }, body: 'x'.repeat(65)
  })
  assert.equal(oversized.status, 413)
  assert.equal(processed.length, 3)
})

test('invalid input and parser failure return one completed error response', async t => {
  const url = await serve(t, createApp({ processRecords: async () => { throw new Error('private details') } }))
  const malformed = await fetch(`${url}/data-processor-buffer`, { method: 'POST', body: 'bad json' })
  assert.equal(malformed.status, 400)
  const response = await fetch(`${url}/data-processor-json`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ data: [{}] })
  })
  assert.equal(response.status, 502)
  assert.deepEqual(await response.json(), { error: 'Processing failed' })
  for (const numThreads of [0, 9, 1.5, '2']) {
    const result = await fetch(`${url}/data-processor-threads`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ data: [{}], numThreads })
    })
    assert.equal(result.status, 400)
  }
})

test('workers partition every record exactly once and report upstream failures', async t => {
  let hits = 0
  let fail = false
  const parser = await serve(t, (req, res) => {
    hits++
    res.writeHead(fail ? 500 : 200)
    res.end()
  })
  const prior = process.env.PARSER_URL
  process.env.PARSER_URL = parser
  t.after(() => { if (prior === undefined) delete process.env.PARSER_URL; else process.env.PARSER_URL = prior })
  const url = await serve(t, createApp())
  const request = () => fetch(`${url}/data-processor-threads`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ data: Array.from({ length: 7 }, (_, id) => ({ id })), numThreads: 3 })
  })
  assert.equal((await request()).status, 200)
  assert.equal(hits, 7)
  fail = true
  assert.equal((await request()).status, 502)
})
