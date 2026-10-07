# Next.js / nuqs dependent shallow update reproduction

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fdrpayyne%2Fexperiments%2Ftree%2Fmain%2Fnext-nuqs-dependent-shallow-update&project-name=next-nuqs-dependent-shallow-update&repository-name=next-nuqs-dependent-shallow-update)

No customer code, backend, credentials, database, or AI SDK. Only Next.js,
React and nuqs. The Next config only scopes Turbopack to this standalone folder;
no experimental routing/cache flags are set.

## Run

```sh
bun install
bun run build
bun run start -- -p 3451
```

Open http://localhost:3451 with no query parameters. Open the browser console and
click **Select item**. Reload between attempts. Production mode is recommended
to avoid confusing Strict Mode effect replay with the actual rollback.

If Bun's minimum-release-age setting rejects the pinned new release, use
`bun install --minimum-release-age=0` for this reproduction.

Prerequisites: Node.js 20.9 or newer and Bun. The recorded trials used Node.js
24.11.0, Bun 1.4.0, and headless Chromium 145 on macOS arm64.

`bun run dev -- -p 3451` also starts a development server, but the measurements
below are from production builds. Reload the page without query parameters
before each attempt; selecting the already-selected value is not a fresh trial.

## Deploy to Vercel

Use the button above to clone this experiment's subdirectory into a new repository
and create a Vercel project. With this method, the experiment becomes the new
repository root: leave **Root Directory** at its default rather than setting it
to `next-nuqs-dependent-shallow-update`. No environment variables are required.
Review the install/build commands and Node.js version below before deploying.

To deploy directly from the full `drpayyne/experiments` repository instead:

1. Import this repository into Vercel as a new project.
2. Set **Root Directory** to `next-nuqs-dependent-shallow-update`.
3. Select the **Next.js** framework preset.
4. Use `bun install --frozen-lockfile --minimum-release-age=0` as the install
   command and `bun run build` as the build command. Keep the default output
   directory and use a supported Node.js version, preferably 24.x to match the
   local trials.
5. Deploy, open the root URL with no query parameters, open the browser console,
   and click **Select item**.

Alternatively, run the Vercel CLI from this experiment directory and deploy it
as an independent project. Do not deploy the repository root as a Next app.

No environment variables, credentials, database, API routes, or external services
are required. A preview deployment of this standalone experiment has not yet
been measured; the results below are local production-build results.

## Actual behavior

The page selects `selected=item-1` after a simulated asynchronous operation.
The selected child's mount effect clears an unrelated, already-absent `filter`
parameter. All nuqs writes use default shallow routing.

`useLayoutEffect` logs committed selections, not speculative render calls:

```text
commit: nuqsSelected="item-1", nextSelected=null,     urlSelected="item-1"
child-effect-setup
commit: nuqsSelected=null,     nextSelected=null,     urlSelected="item-1"
child-effect-cleanup
commit: nuqsSelected="item-1", nextSelected="item-1", urlSelected="item-1"
child-effect-setup
```

The unrelated clear causes nuqs to publish a transient missing selection and
unmount the selected child, even though the browser URL retains the selection.
The visible event log preserves this gap even if the UI flicker is too brief.

## Expected behavior

Clearing `filter` must not change the selected item's committed state or unmount
it. Next search params may lag temporarily; nuqs should preserve the selection
during synchronization.

## Measured production results

React / React DOM pinned to 19.3.0; each trial starts from a fresh page:

| Next | nuqs | Committed rollback |
| --- | --- | --- |
| 16.4.0 | 2.10.1 (latest stable when tested) | 10/10 |
| 16.4.0 | 2.10.2-beta.1 | 10/10 |
| 16.3.3 | 2.10.1 | 0/10 |

No page exceptions occur: this is an observable state/lifecycle bug, not a
console exception.

Recorded on 2026-10-07. [results.json](./results.json) contains the version matrix,
counts, and a representative event trace per configuration. Timings are local
observations, not latency benchmarks. CWV and asset sizes were not measured.

The selected child's effect cleanup accompanies a committed null selection and
is followed by a new setup when the selection returns. Production mode excludes
development-only Strict Mode effect replay as an explanation for this sequence.

## Current status and limitations

This example demonstrates the failure; it intentionally contains no workaround.
The rollback occurs even with default Next routing settings. Both nuqs releases
listed above reproduce it; `2.10.1` was the npm `latest` tag when tested and
`2.10.2-beta.1` was the `beta` tag. Versions are pinned so future releases do not
silently change the example.

Chromium was tested; Firefox and Safari have not been measured. No cross-browser
or full navigation-regression claim is made. The preliminary optimistic adapter
patch discussed below is not applied and has not been validated for overlapping
writes, Back/Forward, debounce, or render-count regressions.

To compare another configuration, change only the relevant dependency version,
reinstall, rebuild, and repeat from a fresh URL. Keep all variants and supporting
files inside this experiment folder if committing a comparison setup.

## Load-bearing conditions

- Selection after an async boundary: the direct synchronous click variant did
  not reproduce in 10 trials. The 10ms timer simulates a fulfilled async task.
- A second nuqs write from the newly mounted child's effect.
- Skipping the already-absent clear avoids the trigger in the larger investigation.
- Replacing the second nuqs write with direct native history.replaceState passed
  in the earlier minimal plain-fetch reproduction.

## Attribution evidence from separate isolated experiments

The triggering Next change was narrowed to
https://github.com/vercel/next.js/pull/99612
(`65498960a66473c0bf937ad41270e27b33949854`), removing the async reducer wrapper.
Restoring that wrapper in 16.4 passed 10/10; removing it in 16.3 failed 10/10.
Cross-swapping bundled React did not change the outcome. These interventions
were only in disposable test copies, not this shareable example.

nuqs internal tracing found its second queue push discards the previously
flushed selection before the Next adapter acknowledges it. Reconciliation then
falls back to stale search params. Updating the adapter's optimistic search
params for shallow writes avoided the failure in 3 preliminary trials, but is
not a validated shipping fix: that condition was introduced as a render-count
optimization in https://github.com/47ng/nuqs/pull/849.

Related previous reports, not claims of an existing fix for Next 16.4:
https://github.com/47ng/nuqs/issues/1099
https://github.com/47ng/nuqs/issues/1365

## Request to maintainers

Please help determine the appropriate compatibility fix: adapter optimistic
state, acknowledgement-aware queue retention, or a router-state synchronization
change. This reproduction does not claim that Next's intentional transition
fix should be reverted or that the proposed nuqs one-line change is safe.
