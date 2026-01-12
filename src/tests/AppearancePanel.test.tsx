// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import AppearancePanel from '../components/AppearancePanel';

expect.extend(matchers);

describe('AppearancePanel', () => {
  beforeEach(() => {
    cleanup();
  });

  const defaultProps = {
    fontFamily: 'serif',
    lineHeight: 1.6,
    margin: 40,
    onFontFamilyChange: vi.fn(),
    onLineHeightChange: vi.fn(),
    onMarginChange: vi.fn(),
  };

  it('renders correctly with default props', () => {
    render(<AppearancePanel {...defaultProps} />);
    // @ts-ignore
    expect(screen.getByText(/Appearance/i)).toBeInTheDocument();
    // @ts-ignore
    expect(screen.getByLabelText(/Font Family/i)).toBeInTheDocument();
    // @ts-ignore
    expect(screen.getByLabelText(/Line Height/i)).toBeInTheDocument();
    // @ts-ignore
    expect(screen.getByLabelText(/Horizontal Margin/i)).toBeInTheDocument();
  });


  it('calls onFontFamilyChange when font selection changes', () => {
    render(<AppearancePanel {...defaultProps} />);
    const select = screen.getByLabelText(/Font Family/i);
    fireEvent.change(select, { target: { value: 'sans-serif' } });
    expect(defaultProps.onFontFamilyChange).toHaveBeenCalledWith('sans-serif');
  });

  it('calls onLineHeightChange when line height slider changes', () => {
    render(<AppearancePanel {...defaultProps} />);
    const slider = screen.getByLabelText(/Line Height/i);
    fireEvent.change(slider, { target: { value: '2' } });
    expect(defaultProps.onLineHeightChange).toHaveBeenCalledWith(2);
  });

  it('calls onMarginChange when margin slider changes', () => {
    render(<AppearancePanel {...defaultProps} />);
    const slider = screen.getByLabelText(/Horizontal Margin/i);
    fireEvent.change(slider, { target: { value: '100' } });
    expect(defaultProps.onMarginChange).toHaveBeenCalledWith(100);
  });
});
