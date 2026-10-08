# Large prerendered Suspense boundaries

**Reproduced:** a completed, build-time-prerendered Suspense boundary can still produce a loading fallback, hidden content, and an inline reveal script. This happens on literal routes and generated `[slug]` routes, and in vanilla React without Next.js, data fetching, or actual suspension.

## What is happening?

React's streaming HTML renderer (Fizz) uses **size-based boundary outlining**. It is a progressive-delivery heuristic, not a maximum content size, cache miss, failed prerender, or necessarily a hydration problem.

The tested renderer defaults `progressiveChunkSize` to **12,800 bytes**. When an eligible completed boundary exceeds the current streaming budget, React emits something equivalent to:

```html
<!--$?--><template id="B:0"></template><p>Loading page…</p><!--/$-->
<div hidden id="S:0"><article>Already-rendered content…</article></div>
<script>/* $RC/$RV moves the content into the boundary and removes the fallback */</script>
```

The hidden container prevents partial content from being displayed before its reveal instruction. That instruction runs independently of application hydration. Blocking external JS bundles did **not** prevent reveal; disabling all JS **did**. A persistent fallback with JS enabled warrants checking inline-script CSP, script errors, HTML transforms, or an incomplete response, rather than assuming the size heuristic alone explains it. CSP was not tested here.

In React 19.3's installed production source, the condition is `flushedByteSize + boundary.byteSize > request.progressiveChunkSize`, with additional eligibility and resource-related conditions. The budget is cumulative, not a promise that every boundary smaller than 12.8 KB is inlined. Boundary markup contributes bytes; total response size, compressed network size, and RSC payload size are not the threshold.

Next's saved `.next/server/app/fixed/large-top.html`, `/cached.html`, and generated slug HTML already contain the fallback and hidden segment. The issue exists in the build artifact, not just a request-time rerender. `/cached` explicitly uses an async `"use cache"` component with `cacheLife('max')` and builds as `○` static.

## Tested versions and scope

- Next.js **16.4.0**, React / React DOM **19.3.0** (exact versions in `package-lock.json`).
- Node **26.6.0**, macOS, Playwright **1.58.2** bundled Chromium, production `next build` + `next start`.
- `cacheComponents: true`, `partialPrefetching: false` to isolate initial document rendering. An initial build with `partialPrefetching` unspecified also reproduced it.
- Four ASCII payload lengths: 8,000, 12,800, 64,000, and 600,000 bytes, plus surrounding HTML.
- No remote resources, credentials, env files, client content components, or artificial delays.

## Measurements

`results.json` records 99 HTTP cases and the generated HTML inspection for the fixed/generated slug matrix and cached component. `browser-results.json` records 36 direct-load checks across normal JS, external scripts blocked, and JS disabled. Payload lengths below exclude surrounding markup.

| Case | Fallbacks / hidden segments in response | Content visible with JS disabled? |
| --- | ---: | --- |
| Fixed 8 KB, top boundary | 0 / 0 | Yes |
| Fixed 12.8 KB, top boundary | 1 / 1 | Not browser-tested at this size |
| Fixed 64 KB, top boundary | 1 / 1 | No |
| Generated slug 64 KB, top boundary | 1 / 1 | No |
| Cached async 64 KB, top boundary | 1 / 1 | No |
| Fixed 64 KB, no explicit boundary | 0 / 0 | Yes |
| Generated slug 64 KB, no **inner** boundary | 1 / 1 | Not browser-tested; outer params boundary remains |
| Fixed 64 KB, sixteen 4 KB boundaries | 14 / 14 | Only two content sections visible |
| Narrow params boundary, built slug, 64 KB static sibling | 0 / 0 | Yes |
| Narrow params boundary, unbuilt slug, 64 KB static sibling | 1 / 1 | Yes; only slug label remains in fallback |
| Vanilla React 64 KB, streaming | 1 / 1 | No |
| Vanilla React 64 KB, pipe at `onAllReady` | 1 / 1 | No |
| Vanilla React 64 KB, `prerenderToNodeStream` | 1 / 1 | No |
| Vanilla React 64 KB, `progressiveChunkSize: 1048576` | 0 / 0 | Yes |
| Vanilla React 64 KB, `renderToString` | 0 / 0 | Not browser-tested |

All normal/external-JS-blocked browser cases settled to visible content, zero visible fallbacks, and no page errors. These are settled-state checks, **not** a measurement of fallback flash duration, first paint, or LCP. No claim is made that every normal load visibly flashes.

Ungenerated `/slug/*-unbuilt` paths have a separate reason to show a fallback: `params` are unknown at build time. Even the 8 KB case streams its params boundary. This is intentionally distinct from the size-only reproduction on generated paths.

## Mitigations

1. **Do not put a large static page under one broad Suspense boundary unnecessarily.** Keep important cached/static content in the visible shell. Remove a page-wide `loading.js` boundary too if that is what wraps the content; this experiment uses explicit Suspense and does not test `loading.js` itself.
2. **Wrap only request-time work.** `/narrow/[slug]` demonstrates keeping the large static sibling outside the boundary that awaits params. In real apps, extract small components that read params, headers, cookies, or uncached data. If the whole page genuinely depends on an unknown slug, a static sibling is not automatically possible.
3. **Small boundaries can improve partial visibility, but are not a complete fix.** The 64 KB split variant still outlines fourteen sections in this renderer; wrapping it all in another broad boundary can hide the whole shell again.
4. **Standalone React:** a larger `progressiveChunkSize` avoids size-based outlining for these payloads. This trades off progressive delivery and is not a universal rule for genuinely suspended content. Next.js does not provide a documented `next.config` option for passing this React renderer setting; do not monkey-patch bundled React as an application fix.
5. **Waiting for readiness is insufficient:** both `onAllReady` and `prerenderToNodeStream` still outlined the completed large boundary. `renderToString` is a synchronous comparison, not a drop-in Next.js fix or a solution for async Suspense.

Adding `"use cache"` or `generateStaticParams` does not by itself prevent size-based outlining. `fallback={null}` would only replace a visible loader with an empty space; it does not make hidden content visible sooner.

## Run locally

From this directory:

```sh
npm ci
npm run build
npm start
```

Next.js: `http://localhost:3100`. In another terminal, from the same directory:

```sh
npm run react
```

Vanilla React: `http://127.0.0.1:3101/large-top`. Then:

```sh
npm run probe
npx playwright install chromium
npm run test:browser
```

If your npm config has a release-date cutoff that excludes these pinned releases, use `npm ci --before=2026-10-09` (the default cutoff on the test machine excluded Next 16.4.0).

`NEXT_URL` and `REACT_URL` optionally override probe/browser origins. Tests overwrite the checked-in measurement JSON. Browser screenshots go to the repository's gitignored `.context/`. The currently tested Next server is also available on port **3103**, because production servers were started fresh after build changes.

### Routes and controls

- `/fixed/{small|edge|large|huge}-{top|none|split}` are literal route files, **not** params routes. `node scripts/generate-fixed.mjs` regenerates them.
- `/slug/<case>` has `generateStaticParams`; `/slug/<case>-unbuilt` is deliberately omitted from that list.
- `/narrow/built` and `/narrow/unbuilt` demonstrate narrow params placement.
- `/cached` demonstrates explicit cached async content.
- Vanilla React uses the same payload/component code: `/<case>`, `?ready=all`, `?api=prerender`, `?api=string`, or `?chunk=1048576`.

Use direct address-bar loads to reproduce document HTML. The index also has unprefetched links, but automated client navigation/prefetch behavior is **not** covered by the reported results. `npm run dev` is available for editing; production artifacts are the proof of build-time behavior.

## Deployment

Deploy the **Next.js app from this directory**:

```sh
vercel
```

Select the Next.js preset, build command `npm run build`, and default Next.js output settings. No environment variables are required. Use `vercel --prod` for production. Deployment itself was not performed or verified.

`react/server.mjs` is a standalone local Node HTTP comparison server, not a Vercel application; `vercel` here deploys only Next.js. The comparison needs a long-running Node host or a separate streaming-capable deployment adapter to deploy remotely.

## Upstream references

- [React renderer source: default progressive chunk size and completed-boundary flushing](https://github.com/facebook/react/blob/main/packages/react-server/src/ReactFizzServer.js). Main can change; the installed 19.3.0 production source is the tested evidence.
- [React `renderToPipeableStream`: `progressiveChunkSize`, readiness, and inline reveal scripts](https://react.dev/reference/react-dom/server/renderToPipeableStream).
- [React 18 working-group streaming discussion](https://github.com/reactwg/react-18/discussions/37).
- [Next.js Cache Components](https://nextjs.org/docs/app/getting-started/cache-components).

For the exact installed implementation inspect `node_modules/react-dom/cjs/react-dom-server.node.production.js` and `node_modules/next/dist/compiled/react-dom/cjs/react-dom-server.node.production.js`: default at line 4193 and completed-boundary outlining condition at lines 7014–7028 in these packages. A matching upstream issue number was not established; this is an implementation-backed reproduction, not a claim that Next.js has acknowledged a particular bug.
