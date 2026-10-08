import { createServer } from 'node:http'
import { createElement as h } from 'react'
import { renderToPipeableStream, renderToString } from 'react-dom/server'
import { prerenderToNodeStream } from 'react-dom/static'
import { parseCase, Scenario } from '../lib/content.js'

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  const scenario = parseCase(url.pathname.slice(1))
  if (!scenario) { res.writeHead(404); res.end('Try /large-top, /small-top, /large-none, or /large-split'); return }
  const tree = h('html', null, h('head', null, h('title', null, 'Vanilla React Suspense')),
    h('body', { style: { fontFamily: 'system-ui', margin: 32 } },
      h('h1', null, `Vanilla React: ${url.pathname}`), h(Scenario, scenario)))
  const options = {}
  const chunk = url.searchParams.get('chunk')
  if (chunk) options.progressiveChunkSize = Number(chunk)
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  if (url.searchParams.get('api') === 'string') {
    res.end('<!DOCTYPE html>' + renderToString(tree))
  } else if (url.searchParams.get('api') === 'prerender') {
    // Readiness before flushing does not necessarily prevent size-based outlining.
    const { prelude } = await prerenderToNodeStream(tree, options)
    prelude.pipe(res)
  } else {
    const stream = renderToPipeableStream(tree, {
      ...options,
      [url.searchParams.get('ready') === 'all' ? 'onAllReady' : 'onShellReady']() { stream.pipe(res) },
      onError(error) { console.error(error) },
    })
  }
}).listen(3101, '127.0.0.1', () => console.log('Vanilla React: http://127.0.0.1:3101/large-top'))
