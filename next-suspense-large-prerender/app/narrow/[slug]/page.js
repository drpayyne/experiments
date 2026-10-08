import { Suspense } from 'react'
import { Content, Fallback } from '../../../lib/content'

export function generateStaticParams() {
  return [{ slug: 'built' }]
}

async function SlugLabel({ params }) {
  const { slug } = await params
  return <p data-slug={slug}>Slug: {slug}</p>
}

export default function Page({ params }) {
  return <main>
    <h1>Narrow boundary mitigation</h1>
    <Suspense fallback={<Fallback label="params" />}><SlugLabel params={params} /></Suspense>
    <Content bytes={64000} />
  </main>
}
