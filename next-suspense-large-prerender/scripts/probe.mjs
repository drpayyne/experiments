import { readFile, writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { cases } from '../lib/content.js'

const next = process.env.NEXT_URL || 'http://127.0.0.1:3100'
const react = process.env.REACT_URL || 'http://127.0.0.1:3101'

export function inspect(html) {
  return {
    bytes: Buffer.byteLength(html),
    fallbacks: (html.match(/data-fallback=/g) || []).length,
    hiddenSegments: (html.match(/<(?:div|span)[^>]*hidden[^>]*id="S:/g) || []).length,
    pendingBoundaries: (html.match(/<!--\$\?-->/g) || []).length,
    revealScript: /\$RC\(/.test(html),
    content: html.includes('data-content='),
  }
}

const results = []
for (const slug of cases) {
  for (const kind of ['fixed', 'slug', 'unbuilt']) {
    const path = kind === 'unbuilt' ? `/slug/${slug}-unbuilt` : `/${kind}/${slug}`
    const response = await fetch(next + path)
    const html = await response.text()
    const row = { target: 'next', path, status: response.status, ...inspect(html) }
    if (kind !== 'unbuilt') {
      const artifact = await readFile(new URL(`../.next/server/app/${kind}/${slug}.html`, import.meta.url), 'utf8')
      row.buildArtifact = inspect(artifact)
    }
    results.push(row)
  }
  for (const query of ['', '?ready=all', '?api=prerender', '?api=string', '?chunk=1048576']) {
    const path = `/${slug}${query}`
    const response = await fetch(react + path)
    results.push({ target: 'react', path, status: response.status, ...inspect(await response.text()) })
  }
}
for (const slug of ['built', 'unbuilt']) {
  const path = `/narrow/${slug}`
  const response = await fetch(next + path)
  results.push({ target: 'next', path, status: response.status, ...inspect(await response.text()) })
}
const cached = await fetch(next + '/cached')
results.push({ target: 'next', path: '/cached', status: cached.status, ...inspect(await cached.text()),
  buildArtifact: inspect(await readFile(new URL('../.next/server/app/cached.html', import.meta.url), 'utf8')) })
await writeFile(new URL('../results.json', import.meta.url), '[\n' + results.map(row => '  ' + JSON.stringify(row)).join(',\n') + '\n]\n')
console.table(results.map(({ buildArtifact, ...row }) => row))
if (results.some(row => row.status !== 200 || !row.content)) process.exitCode = 1
for (const path of ['/fixed/large-top', '/slug/large-top', '/cached']) {
  const row = results.find(row => row.target === 'next' && row.path === path)
  assert.ok(row.hiddenSegments > 0 && row.buildArtifact.hiddenSegments > 0, `${path}: missing outlined content`)
}
assert.equal(results.find(row => row.path === '/fixed/large-none').hiddenSegments, 0)
assert.equal(results.find(row => row.path === '/narrow/built').hiddenSegments, 0)
