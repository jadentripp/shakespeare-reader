// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import AppearancePanel from '../components/AppearancePanel';

expect.extend(matchers);

describe('AppearancePanel', () => {
  beforeAll(() => {
    // @ts-ignore
    global.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    // @ts-ignore
    global.PointerEvent = class extends Event {
      constructor(type: string, props?: PointerEventInit) {
        super(type, props);
      }
    };
    if (!Element.prototype.scrollIntoView) {
      Element.prototype.scrollIntoView = () => {};
    }
  });

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
    expect(screen.getByText(/Reader Appearance/i)).toBeInTheDocument();
    // @ts-ignore
    expect(screen.getByText(/Typeface/i)).toBeInTheDocument();
    // @ts-ignore
    expect(screen.getByText(/Line Spacing/i)).toBeInTheDocument();
    // @ts-ignore
    expect(screen.getByText(/Page Margins/i)).toBeInTheDocument();
  });


  it('calls onFontFamilyChange when font selection changes', async () => {
    render(<AppearancePanel {...defaultProps} />);
    const trigger = screen.getByRole('combobox');
    fireEvent.click(trigger);
    const option = await screen.findByText('System Sans');
    fireEvent.click(option);
    expect(defaultProps.onFontFamilyChange).toHaveBeenCalledWith('sans-serif');
  });

  it('renders sliders for line height and margin', () => {
    render(<AppearancePanel {...defaultProps} />);
    const sliders = screen.getAllByRole('slider');
    expect(sliders).toHaveLength(2);
  });
});
