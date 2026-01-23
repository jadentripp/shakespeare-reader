import { describe, it, expect } from "bun:test";
// @ts-ignore
import fs from 'fs';
// @ts-ignore
import path from 'path';

describe('Global Theme Variables', () => {
  it('should define shadcn theme tokens in index.css', () => {
    // @ts-ignore
    const cssPath = path.resolve(process.cwd(), 'src/index.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    expect(cssContent).toContain('@import "tailwindcss"');
    expect(cssContent).toContain('--background:');
    expect(cssContent).toContain('--foreground:');
    expect(cssContent).toContain('--primary:');
    expect(cssContent).toContain('--radius:');
  });

  it('should apply the new variables to global selectors', () => {
    // @ts-ignore
    const cssPath = path.resolve(process.cwd(), 'src/index.css');
    const cssContent = fs.readFileSync(cssPath, 'utf-8');

    expect(cssContent).toContain('@layer base');
    expect(cssContent).toContain('@apply bg-background text-foreground');
  });
});
