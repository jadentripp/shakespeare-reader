// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Global Theme Variables', () => {
  it('should define classic academic typography variables in App.css', () => {
    const cssPath = path.resolve(__dirname, '../App.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');
    
    expect(cssContent).toContain("--font-serif: 'EB Garamond', serif;");
    expect(cssContent).toContain("--font-sans: 'Inter', sans-serif;");
  });

  it('should define classic academic color palette variables in App.css', () => {
    const cssPath = path.resolve(__dirname, '../App.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    expect(cssContent).toContain('--color-bg-light: #f8f5f2;');
    expect(cssContent).toContain('--color-text-light: #2d3748;');
    expect(cssContent).toContain('--color-bg-dark: #1a202c;');
    expect(cssContent).toContain('--color-text-dark: #cbd5e0;');
    expect(cssContent).toContain('--color-accent: #c0392b;');
  });
});