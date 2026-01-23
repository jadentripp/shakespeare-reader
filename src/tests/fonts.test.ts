import { describe, expect, it } from 'bun:test'
// @ts-expect-error
import fs from 'fs'
// @ts-expect-error
import path from 'path'

describe('Project Fonts', () => {
  it('index.html should include Google Fonts links for EB Garamond and Inter', () => {
    // @ts-expect-error
    const indexPath = path.resolve(process.cwd(), 'index.html')
    const indexContent = fs.readFileSync(indexPath, 'utf-8')

    // Check for preconnect links
    expect(indexContent).toContain('href="https://fonts.googleapis.com"')
    expect(indexContent).toContain('href="https://fonts.gstatic.com"')

    // Check for the actual font stylesheet
    // We expect EB Garamond and Inter
    expect(indexContent).toContain('family=EB+Garamond')
    expect(indexContent).toContain('family=Inter')
  })
})
