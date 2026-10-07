'use client';

import { useEffect, useLayoutEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { parseAsString, useQueryState } from 'nuqs';

function log(event) {
  window.reproEvents ??= [];
  const entry = {
    ms: Math.round(performance.now() * 10) / 10,
    ...event,
    urlSelected: new URLSearchParams(location.search).get('selected'),
  };
  window.reproEvents.push(entry);
  console.log('[url-state-repro]', JSON.stringify(entry));
  const output = document.getElementById('events');
  if (output) output.textContent = window.reproEvents.map((e) => JSON.stringify(e)).join('\n');
}

function SelectedItem() {
  const [, setFilter] = useQueryState('filter', parseAsString);

  useEffect(() => {
    log({ type: 'child-effect-setup' });
    // A dependent update to an unrelated parameter, already absent from the URL.
    setFilter(null);
    return () => log({ type: 'child-effect-cleanup' });
  }, [setFilter]);

  return <p data-testid="selected-item">Selected item is mounted.</p>;
}

export default function Page() {
  const [selected, setSelected] = useQueryState('selected', parseAsString);
  const searchParams = useSearchParams();

  // Log committed state, not render calls that React may discard.
  useLayoutEffect(() => {
    log({
      type: 'commit',
      nuqsSelected: selected,
      nextSelected: searchParams.get('selected'),
    });
  });

  return (
    <main style={{ padding: 24, fontFamily: 'sans-serif' }}>
      <h1>Dependent shallow query update</h1>
      <p>Open the console, then select an item. Reload between attempts.</p>
      <button onClick={async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        log({ type: 'select' });
        setSelected('item-1', { history: 'push' });
      }}>Select item</button>
      <p>nuqs selection: <strong>{selected ?? 'null'}</strong></p>
      <p>Next selection: <strong>{searchParams.get('selected') ?? 'null'}</strong></p>
      {selected ? <SelectedItem /> : <p>No selected item.</p>}
      <h2>Committed-state and lifecycle events</h2>
      <pre id="events" style={{ whiteSpace: 'pre-wrap', fontSize: 12 }} />
    </main>
  );
}
