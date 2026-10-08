import { createElement as h, Suspense } from 'react'

export const sizes = { small: 8000, edge: 12800, large: 64000, huge: 600000 }
export const modes = ['top', 'none', 'split']
export const cases = Object.keys(sizes).flatMap(size => modes.map(mode => `${size}-${mode}`))

export function parseCase(slug) {
  const [size, mode] = slug.split('-')
  return size in sizes && modes.includes(mode) ? { size, mode } : null
}

export function Content({ bytes, label = 'content' }) {
  // One ASCII text node: no fetch, delay, client component, or actual suspension.
  return h('article', { 'data-content': label },
    h('h2', null, 'Prerendered content'),
    h('p', null, 'All of this content is synchronous and available at build time.'),
    h('pre', { style: { whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' } }, 'x'.repeat(bytes)),
  )
}

export function Fallback({ label = 'page' }) {
  return h('p', { 'data-fallback': label, style: { background: '#ffd580', padding: 24 } }, `Loading ${label}…`)
}

export function Scenario({ size, mode }) {
  const bytes = sizes[size]
  if (mode === 'none') return h(Content, { bytes })
  if (mode === 'split') {
    // Keep the important content outside Suspense; use small independent boundaries.
    return h('section', null,
      h('h2', { 'data-shell': true }, 'Visible shell outside Suspense'),
      ...Array.from({ length: Math.ceil(bytes / 4000) }, (_, i) =>
        h(Suspense, { key: i, fallback: h(Fallback, { label: `part-${i}` }) },
          h(Content, { bytes: Math.min(4000, bytes - i * 4000), label: `part-${i}` }))),
    )
  }
  return h(Suspense, { fallback: h(Fallback) }, h(Content, { bytes }))
}
