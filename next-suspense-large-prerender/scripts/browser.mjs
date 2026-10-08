import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from 'playwright'

const next = process.env.NEXT_URL || 'http://127.0.0.1:3100'
const react = process.env.REACT_URL || 'http://127.0.0.1:3101'
const screenshots = new URL('../../.context/', import.meta.url)
await mkdir(screenshots, { recursive: true })
const browser = await chromium.launch({ headless: true })
const results = []
const routes = [
  [next, '/fixed/small-top'], [next, '/fixed/large-top'],
  [next, '/slug/large-top'], [next, '/fixed/large-none'],
  [next, '/fixed/large-split'], [next, '/narrow/built'], [next, '/narrow/unbuilt'],
  [next, '/cached'],
  [react, '/large-top'], [react, '/large-top?ready=all'],
  [react, '/large-top?api=prerender'], [react, '/large-top?chunk=1048576'],
]

try {
  for (const mode of ['normal', 'no-external-js', 'no-js']) {
    const context = await browser.newContext({ javaScriptEnabled: mode !== 'no-js', viewport: { width: 1000, height: 650 } })
    if (mode === 'no-external-js') await context.route('**/*', route =>
      route.request().resourceType() === 'script' ? route.abort() : route.continue())
    const page = await context.newPage()
    for (const [base, path] of routes) {
      const errors = []
      page.removeAllListeners('pageerror')
      page.on('pageerror', error => errors.push(error.message))
      await page.goto(base + path, { waitUntil: 'load' })
      // Two animation frames suffice for most reveals; allow a second for the streaming scheduler.
      await page.waitForTimeout(1000)
      const state = await page.evaluate(() => {
        const visible = selector => [...document.querySelectorAll(selector)].filter(el => el.checkVisibility()).length
        return { visibleContent: visible('[data-content]'), visibleFallbacks: visible('[data-fallback]'), hiddenSegments: document.querySelectorAll('[hidden][id^="S:"]').length }
      })
      results.push({ target: base === next ? 'next' : 'react', path, mode, ...state, errors })
      if (mode !== 'no-js') {
        assert.equal(state.visibleFallbacks, 0, `${mode} ${path}: fallback did not resolve`)
        assert.ok(state.visibleContent > 0, `${mode} ${path}: content not visible`)
        assert.deepEqual(errors, [], `${mode} ${path}: browser error`)
      }
      if (mode === 'no-js' && ['/fixed/large-top', '/slug/large-top', '/large-top'].includes(path)) {
        assert.equal(state.visibleContent, 0)
        assert.ok(state.visibleFallbacks > 0)
        assert.ok(state.hiddenSegments > 0)
      }
      if (mode === 'no-js' && ['/fixed/large-none', '/narrow/built', '/narrow/unbuilt', '/large-top?chunk=1048576'].includes(path)) {
        assert.ok(state.visibleContent > 0, `${path}: static content should remain visible`)
      }
      if (base === next && path === '/fixed/large-top' && mode !== 'no-external-js') {
        await page.screenshot({ path: new URL(`suspense-${mode}.png`, screenshots).pathname })
      }
    }
    await context.close()
  }
  await writeFile(new URL('../browser-results.json', import.meta.url), '[\n' + results.map(row => '  ' + JSON.stringify(row)).join(',\n') + '\n]\n')
  console.table(results.map(({ errors, ...row }) => row))
} finally {
  await browser.close()
}
