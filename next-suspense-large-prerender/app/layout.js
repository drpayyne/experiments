import Link from 'next/link'

export const metadata = { title: 'Large prerendered Suspense experiment' }

export default function Layout({ children }) {
  return <html lang="en"><body style={{ fontFamily: 'system-ui', margin: 32 }}>
    <header><Link href="/">Experiment index</Link></header>
    {children}
  </body></html>
}
