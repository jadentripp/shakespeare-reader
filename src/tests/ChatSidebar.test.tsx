import { beforeEach, describe, expect, it, mock } from 'bun:test'
import { cleanup, render, screen } from '@testing-library/react'
import React from 'react'
import ChatSidebar from '../components/reader/ChatSidebar'

describe('ChatSidebar Bauhaus Alignment', () => {
  const defaultProps: any = {
    contextHint: 'Sample context',
    messages: [],
    prompts: [],
    chatInput: '',
    onChatInputChange: mock(),
    onPromptSelect: mock(),
    onSend: mock(),
    chatSending: false,
    chatInputRef: { current: null },
    currentModel: 'gpt-4o',
    availableModels: ['gpt-4o'],
    onModelChange: mock(),
    modelsLoading: false,
    onCollapse: mock(),
    threads: [],
    currentThreadId: null,
    onSelectThread: mock(),
  }

  beforeEach(() => {
    cleanup()
  })

  it('should have sharp corners and bold 2px borders', () => {
    const { container } = render(<ChatSidebar {...defaultProps} />)
    const sidebar = container.querySelector('aside > div')
    expect(sidebar?.className).toContain('rounded-none')
    expect(sidebar?.className).toContain('border-2')
  })

  it('should use bold geometric sans-serif for the header in a black box', () => {
    render(<ChatSidebar {...defaultProps} />)
    // Component now uses "AI" label in a black box, not "AI ASSISTANT"
    const header = screen.getByText(/AI/)
    expect(header.className).toContain('font-black')
    expect(header.className).toContain('uppercase')
    // The AI label itself is in a black box container
    expect(header.closest('.bg-black')).toBeTruthy()
  })

  it('should have sharp corners on input area', () => {
    render(<ChatSidebar {...defaultProps} />)
    const input = screen.getByPlaceholderText(/Ask about the text/i)
    // Looking for the container of the input or the input itself
    const inputContainer = input.closest('div')
    expect(inputContainer?.className).toContain('rounded-none')
  })
})
