/**
 * Voice Acting Module
 * Uses AI to generate contextual "instruct" prompts for Qwen TTS
 * to create dynamic, emotionally appropriate narration.
 */

import { getSetting } from './tauri/settings'

export interface VoiceInstruction {
  text: string
  instruct: string
}

export interface VoiceActingConfig {
  baseTemplate: string
  model?: string
}

const instructCache = new Map<string, string>()

function hashText(text: string, baseTemplate: string): string {
  let hash = 0
  const combined = text + baseTemplate
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return hash.toString(36)
}

/**
 * Generate a voice acting instruction for a given text passage.
 * Uses OpenAI to analyze the emotional content and generate appropriate speaking directions.
 */
export async function generateVoiceInstruction(
  text: string,
  baseTemplate: string,
  context?: string
): Promise<string> {
  const cacheKey = hashText(text, baseTemplate)
  const cached = instructCache.get(cacheKey)
  if (cached) return cached

  const apiKey = await getSetting('openai_api_key')
  if (!apiKey) {
    console.warn('[VoiceActing] No OpenAI API key, using base template only')
    return baseTemplate
  }

  const model = await getSetting('openai_model') || 'gpt-4o-mini'

  const prompt = `You are a voice acting director. Analyze this text passage and generate a brief speaking instruction for a text-to-speech narrator.

Text to analyze:
"""
${text.substring(0, 800)}
"""

${context ? `Context from previous passage: "${context.substring(0, 200)}"\n` : ''}
Base style: "${baseTemplate}"

Generate a SINGLE, SHORT speaking instruction (max 120 characters) that tells the narrator HOW to read this passage.
Focus on: tone, emotion, pacing, and delivery style.
Examples of good instructions:
- "Read with quiet grief, slow pacing, pauses between sentences"
- "Speak with rising excitement and urgency, faster tempo"
- "Calm, measured tone with warm undertones, conversational"
- "Dramatic and intense, powerful projection, deliberate words"

Return ONLY the instruction, nothing else.`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      console.error('[VoiceActing] OpenAI API error:', response.status)
      return baseTemplate
    }

    const data = await response.json()
    const instruction = data.choices?.[0]?.message?.content?.trim() || baseTemplate

    const finalInstruction = instruction.length > 150
      ? instruction.substring(0, 147) + '...'
      : instruction

    instructCache.set(cacheKey, finalInstruction)
    console.log(`[VoiceActing] Generated instruction: "${finalInstruction}"`)

    return finalInstruction
  } catch (e) {
    console.error('[VoiceActing] Error generating instruction:', e)
    return baseTemplate
  }
}

/**
 * Batch generate voice instructions for multiple paragraphs.
 * More efficient than individual calls - uses a single OpenAI request.
 */
export async function generateBatchInstructions(
  paragraphs: string[],
  baseTemplate: string
): Promise<string[]> {
  if (paragraphs.length === 0) return []
  if (paragraphs.length === 1) {
    return [await generateVoiceInstruction(paragraphs[0], baseTemplate)]
  }

  const allCached = paragraphs.map(p => {
    const key = hashText(p, baseTemplate)
    return instructCache.get(key)
  })

  if (allCached.every(c => c !== undefined)) {
    return allCached as string[]
  }

  const apiKey = await getSetting('openai_api_key')
  if (!apiKey) {
    console.warn('[VoiceActing] No OpenAI API key, using base template')
    return paragraphs.map(() => baseTemplate)
  }

  const model = await getSetting('openai_model') || 'gpt-4o-mini'

  const numberedParagraphs = paragraphs
    .map((p, i) => `[${i + 1}] ${p.substring(0, 300)}`)
    .join('\n\n')

  const prompt = `You are a voice acting director. For each numbered text passage below, generate a brief speaking instruction for a text-to-speech narrator.

Text passages:
${numberedParagraphs}

Base style: "${baseTemplate}"

For EACH passage, provide a speaking instruction (max 100 chars each) describing tone, emotion, pacing, delivery.

Return as JSON array of strings, one instruction per passage:
["instruction for passage 1", "instruction for passage 2", ...]

Return ONLY the JSON array, no other text.`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 500,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      console.error('[VoiceActing] OpenAI batch API error:', response.status)
      return paragraphs.map(() => baseTemplate)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content?.trim() || '[]'

    let instructions: string[]
    try {
      instructions = JSON.parse(content)
    } catch {
      console.error('[VoiceActing] Failed to parse batch response:', content)
      return paragraphs.map(() => baseTemplate)
    }

    while (instructions.length < paragraphs.length) {
      instructions.push(baseTemplate)
    }

    paragraphs.forEach((p, i) => {
      const key = hashText(p, baseTemplate)
      instructCache.set(key, instructions[i])
    })

    console.log(`[VoiceActing] Generated ${instructions.length} batch instructions`)
    return instructions
  } catch (e) {
    console.error('[VoiceActing] Batch error:', e)
    return paragraphs.map(() => baseTemplate)
  }
}

/**
 * Split text into paragraphs for voice acting processing.
 */
export function splitIntoParagraphs(text: string): string[] {
  return text
    .split(/\n\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 20)
}

/**
 * Clear the instruction cache (useful when changing settings).
 */
export function clearInstructCache(): void {
  instructCache.clear()
  console.log('[VoiceActing] Cache cleared')
}
