import { Suspense } from 'react';
import { NuqsAdapter } from 'nuqs/adapters/next/app';

export default function Layout({ children }) {
  return (
    <html lang="en">
      <body>
        <Suspense fallback={<p>Loading…</p>}>
          <NuqsAdapter>{children}</NuqsAdapter>
        </Suspense>
      </body>
    </html>
  );
}
