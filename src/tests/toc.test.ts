import { describe, it, expect } from "bun:test";
import { parseSceneLinksHierarchical } from "../lib/readerHtml";

describe('parseSceneLinksHierarchical', () => {
  it('should group scenes under acts', () => {
    const html = `
      <a href="#act1">ACT I</a>
      <a href="#scene1">SCENE I. A desert place.</a>
      <a href="#scene2">SCENE II. A camp near Forres.</a>
      <a href="#act2">ACT II</a>
      <a href="#scene3">SCENE I. Court of Macbeth’s castle.</a>
    `;
    const result = parseSceneLinksHierarchical(html);
    
    expect(result).toHaveLength(2);
    expect(result[0].label).toBe('ACT I');
    expect(result[0].scenes).toHaveLength(2);
    expect(result[0].scenes[0].label).toBe('SCENE I. A desert place.');
    
    expect(result[1].label).toBe('ACT II');
    expect(result[1].scenes).toHaveLength(1);
    expect(result[1].scenes[0].label).toBe('SCENE I. Court of Macbeth’s castle.');
  });

  it('should handle scenes before any act', () => {
    const html = `
      <a href="#intro">INTRODUCTION</a>
      <a href="#scene0">SCENE 0. Prologue.</a>
      <a href="#act1">ACT I</a>
    `;
    const result = parseSceneLinksHierarchical(html);
    
    expect(result).toHaveLength(2);
    expect(result[0].label).toBe('Front Matter');
    expect(result[0].scenes).toHaveLength(1);
  });
});
