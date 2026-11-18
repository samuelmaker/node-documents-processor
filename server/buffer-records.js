// The demo client sends newline-separated JSON records enclosed in [ and ].
module.exports = body => {
  if (!Buffer.isBuffer(body) || body.length === 0) {
    const error = new Error('A nonempty request body is required')
    error.status = 400
    throw error
  }
  try {
    const lines = body.toString('utf8').split('\n').map(line => line.trim()).filter(Boolean)
    if (lines[0] === '[') lines.shift()
    if (lines[lines.length - 1] === ']') lines.pop()
    if (!lines.length) throw new Error('No records')
    const records = lines.map(line => JSON.parse(line))
    if (records.some(record => !record || typeof record !== 'object' || Array.isArray(record))) throw new Error('Expected records')
    return records
  } catch (cause) {
    const error = new Error('Expected newline-separated JSON records')
    error.status = 400
    throw error
  }
}
