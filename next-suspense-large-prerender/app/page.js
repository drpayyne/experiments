import Link from 'next/link'
import { cases } from '../lib/content'

export default function Page() {
  return <main>
    <h1>Large prerendered Suspense boundaries</h1>
    <p>Orange means a fallback. Test direct loads, disable JavaScript, and compare boundary placement.</p>
    <p>top = one page-wide boundary; none = no explicit boundary; split = 4 KB boundaries.</p>
    <table><thead><tr><th>Case</th><th>Fixed path</th><th>Generated slug</th><th>Ungenerated slug</th></tr></thead>
      <tbody>{cases.map(slug => <tr key={slug}>
        <td>{slug}</td>
        <td><Link prefetch={false} href={`/fixed/${slug}`}>fixed</Link></td>
        <td><Link prefetch={false} href={`/slug/${slug}`}>generated</Link></td>
        <td><Link prefetch={false} href={`/slug/${slug}-unbuilt`}>unbuilt</Link></td>
      </tr>)}</tbody>
    </table>
    <p>Keep static content outside the params boundary: <Link href="/narrow/built">built slug</Link> / <Link href="/narrow/unbuilt">unbuilt slug</Link>.</p>
    <p>Explicit cached async content: <Link href="/cached">use cache</Link>.</p>
  </main>
}
