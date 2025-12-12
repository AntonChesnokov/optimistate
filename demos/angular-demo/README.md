# optimistate Angular Demo

Angular 21 demo showcasing **optimistate** integration with signals and standalone components.

## Features

- ✅ **Direct signal integration** - No wrappers needed!
- ✅ Standalone component architecture
- ✅ OnPush change detection
- ✅ Optimistic updates with automatic rollback
- ✅ Status tracking (idle/pending/success/error)
- ✅ 30% simulated failure rate for testing

## Prerequisites

Before running this demo, you must build the library:

```bash
# From repository root
cd ../..
npm install
npm run build
```

## Install Dependencies

```bash
npm install
```

This will install the built library from `../../dist`.

## Development Server

```bash
npm start
```

Open [http://localhost:4200](http://localhost:4200) in your browser.

## Build

```bash
npm run build
```

Build artifacts will be stored in the `dist/` directory.

## Running Tests

```bash
npm test
```

## Linting

```bash
npm run lint
```

## How It Works

The demo implements an optimistic counter that:

1. **Updates immediately** when you click increment buttons
2. **Simulates a network request** (800ms delay)
3. **Randomly fails** 30% of the time
4. **Automatically rolls back** on failure
5. **Shows status** during the entire operation

### Key Implementation

```typescript
import { signal } from '@angular/core';
import { createOptimisticAction } from 'optimistate';

const count = signal(0);
const status = signal<'idle' | 'pending' | 'success' | 'error'>('idle');

const increment = createOptimisticAction({
  sources: { count },  // ← Angular signal works directly!
  mutate: (snapshot, payload: { delta: number }) => ({
    count: snapshot.count + payload.delta,
  }),
  operation: async () => {
    await new Promise((resolve) => setTimeout(resolve, 800));
    if (Math.random() < 0.3) throw new Error('Random failure');
  },
  status,
  error,
});

await increment.run({ delta: 1 });
```

## Learn More

- [optimistate Library Documentation](../../README.md)
- [Angular Documentation](https://angular.dev)
- [All Framework Demos](../README.md)
