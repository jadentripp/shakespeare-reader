import { describe, it, expect } from "bun:test";
import { render, screen } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';
import ReaderLayout from '../components/ReaderLayout';

expect.extend(matchers);

describe('ReaderLayout', () => {
  it('renders children', () => {
    render(
      <ReaderLayout columns={1}>
        <div data-testid="content">Test Content</div>
      </ReaderLayout>
    );
    expect(screen.getByTestId('content')).toBeDefined();
  });

  it('stores the column count on the root element', () => {
    const { container } = render(
      <ReaderLayout columns={1}>
        <div>Test Content</div>
      </ReaderLayout>
    );
    // @ts-ignore
    expect(container.firstChild).toHaveAttribute('data-columns', '1');
  });

  it('updates the column count when set to 2', () => {
    const { container } = render(
      <ReaderLayout columns={2}>
        <div>Test Content</div>
      </ReaderLayout>
    );
    // @ts-ignore
    expect(container.firstChild).toHaveAttribute('data-columns', '2');
  });
});
