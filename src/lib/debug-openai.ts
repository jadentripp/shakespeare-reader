import OpenAI from 'openai'

const apiKey = process.env.OPENAI_API_KEY

if (!apiKey) {
  console.error('Please set OPENAI_API_KEY environment variable.')
  process.exit(1)
}

const client = new OpenAI({
  apiKey,
})

async function listAllModels() {
  console.log('Fetching all models...')
  try {
    const response = await client.models.list()
    console.log(`Total models found: ${response.data.length}`)

    const now = Math.floor(Date.now() / 1000)
    const cutoff = now - 60 * 60 * 24 * 540

    console.log(`Current time: ${now}`)
    console.log(`Cutoff time: ${cutoff}`)

    const mapped = response.data.map((m) => ({
      id: m.id,
      created: m.created,
      passesFilter: (id: string, created: number | null) => {
        if (!id.startsWith('gpt-')) return 'fail: not gpt'
        if (id.startsWith('gpt-3.5')) return 'fail: gpt-3.5'
        if (id.startsWith('gpt-5')) return 'pass: gpt-5'
        if (created && created < cutoff) return 'fail: too old'
        return 'pass'
      },
    }))

    console.log('\nModel Filter Results:')
    mapped.forEach((m) => {
      const result = m.passesFilter(m.id, m.created)
      if (result.startsWith('pass')) {
        console.log(`✅ ${m.id} (${m.created}) -> ${result}`)
      } else if (m.id.startsWith('gpt')) {
        console.log(`❌ ${m.id} (${m.created}) -> ${result}`)
      }
    })
  } catch (error) {
    console.error('Error fetching models:', error)
  }
}

listAllModels()
