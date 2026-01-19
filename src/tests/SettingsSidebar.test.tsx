// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import SettingsSidebar from '../components/settings/SettingsSidebar';

expect.extend(matchers);

describe('SettingsSidebar', () => {
  const mockOnTabChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all settings categories', () => {
    render(<SettingsSidebar activeTab="appearance" onTabChange={mockOnTabChange} />);
    
    // @ts-ignore
    expect(screen.getByText(/Appearance/i)).toBeInTheDocument();
    // @ts-ignore
    expect(screen.getByText(/AI Assistant/i)).toBeInTheDocument();
    // @ts-ignore
    expect(screen.getByText(/Audio & TTS/i)).toBeInTheDocument();
  });

  it('calls onTabChange when a category is clicked', () => {
    render(<SettingsSidebar activeTab="appearance" onTabChange={mockOnTabChange} />);
    
    fireEvent.click(screen.getByText(/AI Assistant/i));
    expect(mockOnTabChange).toHaveBeenCalledWith('ai');

    fireEvent.click(screen.getByText(/Audio & TTS/i));
    expect(mockOnTabChange).toHaveBeenCalledWith('audio');
  });

  it('highlights the active tab', () => {
    const { rerender } = render(<SettingsSidebar activeTab="appearance" onTabChange={mockOnTabChange} />);
    
    // Check if appearance has active styles (this depends on implementation, but let's check for a data attribute or class)
    // For now, let's assume we use a data-active attribute
    expect(screen.getByText(/Appearance/i).closest('button')).toHaveAttribute('data-active', 'true');
    expect(screen.getByText(/AI Assistant/i).closest('button')).toHaveAttribute('data-active', 'false');

    rerender(<SettingsSidebar activeTab="ai" onTabChange={mockOnTabChange} />);
    expect(screen.getByText(/Appearance/i).closest('button')).toHaveAttribute('data-active', 'false');
    expect(screen.getByText(/AI Assistant/i).closest('button')).toHaveAttribute('data-active', 'true');
  });
});
