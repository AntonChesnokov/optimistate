# optimistate

Framework-agnostic optimistic update + rollback utilities with first-class TypeScript support.

**Works with:** Angular, React, Vue, Svelte, and any JavaScript framework with reactive state.

## Packages

- **Library**: `optimistate` (`src/`) – framework-agnostic core
- **Demo apps**: Multiple framework examples in [demos/](demos/)
  - Angular ([demos/angular-demo](demos/angular-demo))
  - React ([demos/react-demo](demos/react-demo))
  - Vue ([demos/vue-demo](demos/vue-demo))
  - Svelte ([demos/svelte-demo](demos/svelte-demo))

## Prerequisites

- Node.js 20+
- npm

## Install

```bash
npm i optimistate
```

## Build the library

```bash
npm run build
```

Artifacts land in `dist/` (ESM + types built with `tsc`).

## Run the demos

All demos are independent applications in the [demos/](demos/) folder. Each has its own dependencies and build configuration.

```bash
# Angular demo
cd demos/angular-demo
npm install
npm start
# Open http://localhost:4200

# React demo
cd demos/react-demo
npm install
npm run dev
# Open http://localhost:5173

# Vue demo
cd demos/vue-demo
npm install
npm run dev
# Open http://localhost:5174

# Svelte demo
cd demos/svelte-demo
npm install
npm run dev
# Open http://localhost:5175
```

See [demos/README.md](demos/README.md) for detailed instructions.

## Unit tests

```bash
# Test library
npm test

# Test individual demos (from their directories)
cd demos/angular-demo && npm test
cd demos/react-demo && npm test  # (if tests exist)
cd demos/vue-demo && npm test    # (if tests exist)
cd demos/svelte-demo && npm test # (if tests exist)
```

## Quick Start (Library Usage)

### Basic Example (Framework-Agnostic)

```ts
import { createOptimisticAction, type WritableRef } from 'optimistate';

const state = { count: 0 };

const countRef: WritableRef<number> = {
  get: () => state.count,
  set: (next) => (state.count = next),
};

const increment = createOptimisticAction({
  sources: { count: countRef },
  mutate: (snapshot, payload: { delta: number }) => ({
    count: snapshot.count + payload.delta,
  }),
  operation: async () => {
    await fetch('/api/increment', { method: 'POST' });
  },
});

// UI updates immediately, rolls back on error
await increment.run({ delta: 1 });
```

### With Angular Signals

Angular signals work directly (no wrapper needed):

```ts
import { signal } from '@angular/core';
import { createOptimisticAction } from 'optimistate';

const count = signal(0);
const status = signal<'idle' | 'pending' | 'success' | 'error'>('idle');
const error = signal<unknown | null>(null);

const increment = createOptimisticAction({
  sources: { count }, // ← Pass signal directly
  mutate: (snapshot, payload: { delta: number }) => ({
    count: snapshot.count + payload.delta,
  }),
  operation: async () => {
    await fetch('/api/increment', { method: 'POST' });
  },
  status, // ← Optional: wire your own status signal
  error,  // ← Optional: wire your own error signal
});

await increment.run({ delta: 1 });

// Even without providing status/error, they're always accessible:
console.log(increment.status); // Auto-created if not provided
console.log(increment.error);  // Auto-created if not provided
```

### With Custom Rollback

```ts
const save = createOptimisticAction({
  sources: { profile: profileSignal },
  mutate: (snapshot, payload: Partial<Profile>) => ({
    profile: { ...snapshot.profile, ...payload },
  }),
  operation: async ({ payload }) => {
    await fetch('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
  rollback: ({ snapshot, error }) => {
    // Custom rollback logic instead of automatic revert
    profileSignal.set(snapshot.profile);
    console.error('Save failed:', error);
  },
});

await save.run({ name: 'New Name' });
```

### With Angular HttpClient

```ts
import { firstValueFrom } from 'rxjs';
import { HttpClient } from '@angular/common/http';

const save = createOptimisticAction({
  sources: { profile: profileSignal },
  mutate: (snapshot, payload: Partial<Profile>) => ({
    profile: { ...snapshot.profile, ...payload },
  }),
  operation: async ({ payload }) =>
    firstValueFrom(http.put<Profile>('/api/profile', payload)),
});
```

## API Overview

### Core Functions

- `createOptimisticAction(config)` – Creates reusable action with auto status/error tracking
- `runOptimistic(operation, payload)` – Low-level function for one-off updates

See the library API docs in this README for:
- Complete API documentation
- Framework integration examples (React, Vue, Svelte, Solid.js)
- Advanced usage patterns

## Development Scripts

**Library (from root):**
```bash
npm run build      # Build library
npm run watch      # Watch mode
npm test           # Run tests
npm run lint       # Lint library code
npm run typecheck  # TypeScript type checking
```

**Demos (from their directories):**
```bash
cd demos/angular-demo
npm install
npm start          # Dev server
npm run build      # Production build
npm test           # Run tests
npm run lint       # Lint code
```

## Publishing the Library

```bash
npm run build
cd dist
npm publish
```

## Project Structure

- `src/` – Library source code
  - `src/lib/` – Core implementation
  - `src/public-api.ts` – Public API surface
- `demos/` – Framework demo applications
  - `angular-demo/` – Angular standalone app with signals
  - `react-demo/` – React app with hooks
  - `vue-demo/` – Vue 3 app with Composition API
  - `svelte-demo/` – Svelte app with stores
- `dist/` – Built library (after `npm run build`)

## License

MIT
