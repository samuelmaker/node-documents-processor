import words from 'random-words'

export default (numRecords = 2000) => {
  let result = []

  for (let i = 0; i < numRecords; i++) {
    result.push({
      id: crypto.randomUUID(),
      sentence: words({ min: 8, max: 20 }).join(' ')
    })
  }

  return result
}
