const { test } = require('node:test')
const assert = require('node:assert/strict')
const parse = require('../server/buffer-records')

test('parses the original client framing, UTF-8 and a final record without a newline', () => {
  assert.deepEqual(parse(Buffer.from('[\n{"sentence":"café"}\n{"id":2}\n]')), [{ sentence: 'café' }, { id: 2 }])
  assert.deepEqual(parse(Buffer.from('{"id":3}')), [{ id: 3 }])
})

test('rejects empty and malformed data with a client error', () => {
  for (const input of [undefined, Buffer.alloc(0), Buffer.from('[]'), Buffer.from('not json')]) {
    assert.throws(() => parse(input), { status: 400 })
  }
})
