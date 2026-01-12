import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Project Fonts', () => {
  it('index.html should include Google Fonts links for EB Garamond and Inter', () => {
    const indexPath = path.resolve(__dirname, '../../index.html');
    const indexContent = fs.readFileSync(indexPath, 'utf-8');

    // Check for preconnect links
    expect(indexContent).toContain('href="https://fonts.googleapis.com"');
    expect(indexContent).toContain('href="https://fonts.gstatic.com"');

    // Check for the actual font stylesheet
    // We expect EB Garamond and Inter
    expect(indexContent).toContain('family=EB+Garamond');
    expect(indexContent).toContain('family=Inter');
  });
});
