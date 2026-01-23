import { describe, expect, it } from 'bun:test'
import { buildChatSystemPrompt } from '../lib/reader/citations'

describe('buildChatSystemPrompt Context Integration', () => {
  const basePageContent = [{ text: 'Page content line 1', blockIndex: 0, pageNumber: 1 }]

  it('should include multiple staged snippets in the system prompt', () => {
    const stagedSnippets = [
      {
        text: 'Snippet 1',
        id: '1',
        startPath: [],
        startOffset: 0,
        endPath: [],
        endOffset: 0,
        rect: { top: 0, left: 0, width: 0, height: 0 },
      },
      {
        text: 'Snippet 2',
        id: '2',
        startPath: [],
        startOffset: 0,
        endPath: [],
        endOffset: 0,
        rect: { top: 0, left: 0, width: 0, height: 0 },
      },
    ]

    const prompt = buildChatSystemPrompt({
      stagedSnippets,
      pageContent: basePageContent,
    })

    const promptStr = prompt.join('\n')
    expect(promptStr).toContain('### CONTEXT: STAGED TEXT SEGMENTS')
    expect(promptStr).toContain('"Snippet 1"')
    expect(promptStr).toContain('"Snippet 2"')
  })

  it('should include both staged snippets and permanent highlights', () => {
    const stagedSnippets = [
      {
        text: 'Staged 1',
        id: '1',
        startPath: [],
        startOffset: 0,
        endPath: [],
        endOffset: 0,
        rect: { top: 0, left: 0, width: 0, height: 0 },
      },
    ]
    const attachedHighlights = [{ id: 101, text: 'Permanent 1' }]

    const prompt = buildChatSystemPrompt({
      stagedSnippets,
      attachedHighlights,
      pageContent: basePageContent,
    })

    const promptStr = prompt.join('\n')
    expect(promptStr).toContain('### CONTEXT: STAGED TEXT SEGMENTS')
    expect(promptStr).toContain('"Staged 1"')
    expect(promptStr).toContain('### CONTEXT: ADDITIONAL ATTACHED HIGHLIGHTS')
    expect(promptStr).toContain('"Permanent 1"')
  })

  it('should prioritize selectedHighlight if provided', () => {
    const selectedHighlight = { id: 1, text: 'Selected' }
    const stagedSnippets = [
      {
        text: 'Staged',
        id: '1',
        startPath: [],
        startOffset: 0,
        endPath: [],
        endOffset: 0,
        rect: { top: 0, left: 0, width: 0, height: 0 },
      },
    ]

    const prompt = buildChatSystemPrompt({
      selectedHighlight,
      stagedSnippets,
      pageContent: basePageContent,
    })

    const promptStr = prompt.join('\n')
    expect(promptStr).toContain('### PRIMARY FOCUS: SELECTED HIGHLIGHT')
    expect(promptStr).toContain('"Selected"')
    expect(promptStr).toContain('### CONTEXT: STAGED TEXT SEGMENTS')
    expect(promptStr).toContain('"Staged"')
  })
})
