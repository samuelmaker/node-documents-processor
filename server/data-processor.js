const externalServer = process.env.PARSER_URL || 'http://127.0.0.1:8095/mock-parser'

module.exports = async data => {
  for (const record of data) {
    const response = await fetch(externalServer, { method: 'POST', signal: AbortSignal.timeout(10000) })
    if (!response.ok) throw new Error('External parser failed')
    await response.arrayBuffer()
  }
  return data.length
}
