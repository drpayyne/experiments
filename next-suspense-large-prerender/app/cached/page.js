import { Suspense } from 'react'
import { cacheLife } from 'next/cache'
import { Content, Fallback } from '../../lib/content'

async function CachedContent() {
  'use cache'
  cacheLife('max')
  await Promise.resolve()
  return <Content bytes={64000} />
}

export default function Page() {
  return <main><h1>Cached async component</h1>
    <Suspense fallback={<Fallback />}><CachedContent /></Suspense>
  </main>
}
