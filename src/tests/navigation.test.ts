import { describe, it, expect } from "bun:test";
import { cleanFootnoteContent } from '../lib/readerUtils';

describe('cleanFootnoteContent', () => {
  it('should remove return links like "back"', () => {
    const html = 'This is a footnote <a href="#ref">back</a>';
    expect(cleanFootnoteContent(html)).toBe('This is a footnote');
  });

  it('should remove return links like "↑"', () => {
    const html = 'Some content <a href="#ref">↑</a>';
    expect(cleanFootnoteContent(html)).toBe('Some content');
  });

  it('should remove return links like "↩"', () => {
    const html = 'Some content <a href="#ref">↩</a>';
    expect(cleanFootnoteContent(html)).toBe('Some content');
  });

  it('should strip [1] style prefixes from text nodes', () => {
    const html = '[123] This is the content';
    expect(cleanFootnoteContent(html)).toBe('This is the content');
  });

  it('should remove citation numbers like "[1]"', () => {
    const html = '<a href="#ref">[1]</a> This is the content';
    expect(cleanFootnoteContent(html)).toBe('This is the content');
  });

  it('should keep other links', () => {
    const html = 'See <a href="http://example.com">this link</a> for more info';
    expect(cleanFootnoteContent(html)).toBe('See <a href="http://example.com">this link</a> for more info');
  });

  it('should handle complex HTML', () => {
    const html = '<div><strong>Important:</strong> Something happened. <a href="#ref">Return to text.</a></div>';
    expect(cleanFootnoteContent(html)).toBe('<div><strong>Important:</strong> Something happened. </div>');
  });
});
