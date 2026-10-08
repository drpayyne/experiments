import { Suspense } from 'react'
import { notFound } from 'next/navigation'
import { cases, parseCase, Scenario, Fallback } from '../../../lib/content'

export function generateStaticParams() {
  return cases.map(slug => ({ slug }))
}

async function SlugContent({ params }) {
  const { slug } = await params
  const scenario = parseCase(slug)
  if (!scenario) notFound()
  return <main><h1>Slug: {slug}</h1><Scenario {...scenario} /></main>
}

export default function Page({ params }) {
  // Unknown params are request-time data. The generated params are known at build.
  return <Suspense fallback={<Fallback label="params" />}><SlugContent params={params} /></Suspense>
}
