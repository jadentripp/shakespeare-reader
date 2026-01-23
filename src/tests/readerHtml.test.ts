import { describe, it, expect } from "bun:test";
import { processGutenbergContent } from "../lib/readerHtml";

describe('processGutenbergContent', () => {
  it('should inject data-block-index into meaningful blocks', () => {
    const html = `
      <h1>Title</h1>
      <p>Paragraph 1</p>
      <blockquote>Quote</blockquote>
      <p>Paragraph 2</p>
      <ul>
        <li>Item 1</li>
        <li>Item 2</li>
      </ul>
    `;
    const result = processGutenbergContent(html);
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(result.html, "text/html");
    
    const h1 = doc.querySelector('h1');
    const ps = doc.querySelectorAll('p');
    const bq = doc.querySelector('blockquote');
    const lis = doc.querySelectorAll('li');
    
    expect(h1?.getAttribute('data-block-index')).toBe('0');
    expect(ps[0].getAttribute('data-block-index')).toBe('1');
    expect(bq?.getAttribute('data-block-index')).toBe('2');
    expect(ps[1].getAttribute('data-block-index')).toBe('3');
    expect(lis[0].getAttribute('data-block-index')).toBe('4');
    expect(lis[1].getAttribute('data-block-index')).toBe('5');
  });

  it('should extract metadata correctly', () => {
    const html = `
      Title: The Tragedy of Macbeth
      Author: William Shakespeare
      Translator: Someone Else
      Annotator: A Scholar
      <p>Content</p>
    `;
    const result = processGutenbergContent(html);
    
    expect(result.metadata.title).toBe('The Tragedy of Macbeth');
    expect(result.metadata.author).toBe('William Shakespeare');
    expect(result.metadata.translator).toBe('Someone Else');
    expect(result.metadata.annotator).toBe('A Scholar');
  });
});
