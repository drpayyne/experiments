# Experiments

Small, self-contained experiments that reproduce bugs or test framework and library behavior with minimal code. Each experiment documents its current state, exact versions, measured results, and instructions for running locally or deploying independently.

## Experiments

- [Next / nuqs dependent shallow update](./next-nuqs-dependent-shallow-update/) — Demonstrates a committed query-state rollback and child unmount when a dependent shallow update follows an asynchronous selection on Next.js 16.4.

## Organization

Each experiment lives in a kebab-case folder. All apps, comparison variants, tests, and supporting files for an experiment stay inside that folder. Experiments are independent projects, not a shared workspace: install and run commands from the relevant experiment directory.

The README in each experiment explains the expected and observed behavior, what was tested, measurements, local reproduction steps, deployment instructions, configuration, limitations, and relevant upstream discussions. Results describe the tested versions and environment, not guarantees about every browser or future release.

Experiments must not contain customer-specific code, credentials, installed dependencies, or generated build output.
