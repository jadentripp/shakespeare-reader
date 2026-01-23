import { beforeEach, describe, expect, it, mock } from 'bun:test'
import * as matchers from '@testing-library/jest-dom/matchers'
import { fireEvent, render, screen } from '@testing-library/react'
import React from 'react'

expect.extend(matchers)

describe('SettingsSidebar', () => {
  const mockOnTabChange = mock()

  beforeEach(() => {
    mockOnTabChange.mockClear()
  })

  it('renders all settings categories', () => {
    render(<SettingsSidebar activeTab="appearance" onTabChange={mockOnTabChange} />)

    expect(screen.getByText(/Appearance/i)).toBeInTheDocument()
    expect(screen.getByText(/AI Assistant/i)).toBeInTheDocument()
    expect(screen.getByText(/Audio & TTS/i)).toBeInTheDocument()
  })

  it('calls onTabChange when a category is clicked', () => {
    render(<SettingsSidebar activeTab="appearance" onTabChange={mockOnTabChange} />)

    fireEvent.click(screen.getByText(/AI Assistant/i))
    expect(mockOnTabChange).toHaveBeenCalledWith('ai')

    fireEvent.click(screen.getByText(/Audio & TTS/i))
    expect(mockOnTabChange).toHaveBeenCalledWith('audio')
  })

  it('highlights the active tab', () => {
    const { rerender } = render(
      <SettingsSidebar activeTab="appearance" onTabChange={mockOnTabChange} />,
    )

    expect(screen.getByText(/Appearance/i).closest('button')).toHaveAttribute('data-active', 'true')
    expect(screen.getByText(/AI Assistant/i).closest('button')).toHaveAttribute(
      'data-active',
      'false',
    )

    rerender(<SettingsSidebar activeTab="ai" onTabChange={mockOnTabChange} />)
    expect(screen.getByText(/Appearance/i).closest('button')).toHaveAttribute(
      'data-active',
      'false',
    )
    expect(screen.getByText(/AI Assistant/i).closest('button')).toHaveAttribute(
      'data-active',
      'true',
    )
  })
})

import SettingsSidebar from '../components/settings/SettingsSidebar'
