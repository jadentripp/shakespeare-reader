import { describe, expect, it } from 'bun:test'

describe('Pollution Check', () => {
  it('should set a value in localStorage', () => {
    localStorage.setItem('test-pollution', 'guilty')
    expect(localStorage.getItem('test-pollution')).toBe('guilty')
  })

  it('should find localStorage empty in a fresh test', () => {
    // This test should fail if there is pollution
    expect(localStorage.getItem('test-pollution')).toBeNull()
  })

  it('should add an element to the body', () => {
    const el = document.createElement('div')
    el.id = 'polluter'
    document.body.appendChild(el)
    expect(document.getElementById('polluter')).not.toBeNull()
  })

  it('should find the body empty in a fresh test', () => {
    expect(document.getElementById('polluter')).toBeNull()
    expect(document.body.innerHTML).toBe('')
  })
})
