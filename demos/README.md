# optimistate Framework Demos

Interactive demo applications showcasing **optimistate** integration with popular JavaScript frameworks.

Each demo implements the same optimistic counter with:
- ✅ Immediate UI updates (optimistic)
- ✅ Automatic rollback on failure
- ✅ Status tracking (idle/pending/success/error)
- ✅ 30% simulated failure rate for testing

## Available Demos

### 1. Angular Demo
**Location**: `angular-demo/`
**Template**: Angular 21 + Signals + Standalone Components

```bash
cd angular-demo
npm install
npm start
```

Open http://localhost:4200

**Key Features**:
- **Direct integration** - Angular signals work without wrapper!
- Standalone component architecture
- OnPush change detection
- 30% simulated failure rate, 800ms delay

---

### 2. React Demo
**Location**: `react-demo/`  
**Template**: React 18 + TypeScript + Vite

```bash
cd react-demo
npm run dev
```

Open http://localhost:5173

**Key Features**:
- Custom `useOptimisticCounter()` hook
- Wraps `useState` in `WritableRef` objects
- Demonstrates React patterns with optimistate
- 30% simulated failure rate, 800ms delay

---

### 3. Vue Demo
**Location**: `vue-demo/`  
**Template**: Vue 3 + TypeScript + Vite

```bash
cd vue-demo
npm run dev
```

Open http://localhost:5174

**Key Features**:
- Composition API with `<script setup>`
- Vue `ref()` via tiny adapter (see `countRef` in `src/App.vue`)
- Reactive template bindings
- 30% simulated failure rate, 800ms delay

---

### 4. Svelte Demo
**Location**: `svelte-demo/`  
**Template**: Svelte + TypeScript + Vite

```bash
cd svelte-demo
npm run dev
```

Open http://localhost:5175

**Key Features**:
- Writable stores with adapter pattern
- Reactive `$` syntax
- Svelte-specific integration
- 30% simulated failure rate, 800ms delay

---

## Running Demos

**All demos are independent** - navigate to their directory and run:

```bash
cd <demo-name>

# Install dependencies (first time only)
npm install

# Start dev server
npm start          # Angular
npm run dev        # React, Vue, Svelte

# Build for production
npm run build

# Preview production build (React, Vue, Svelte only)
npm run preview
```

**Prerequisites**: Build the library first!
```bash
cd ../..           # Go to repository root
npm run build      # Build optimistate library
```

## What You'll See

Each demo shows:
1. **Current count** - Updates immediately when you click
2. **Status badge** - Shows current operation state
3. **Action buttons** - Increment by -1, +1, or +5
4. **Reset button** - Clear counter and status
5. **Error messages** - Displayed when operations fail (30% chance)
6. **Success messages** - Shown on successful operations

## Testing the Rollback

To see the automatic rollback in action:

1. Click any increment button multiple times rapidly
2. Watch the counter increase immediately (optimistic update)
3. If a request fails (30% chance), you'll see:
   - Counter rolls back to previous value
   - Status changes to "error"
   - Error message displays
4. If successful:
   - Counter stays at new value
   - Status changes to "success"
   - Success message displays

## Library Location

All demos use the built library from:
```
../../dist
```

To test with the latest changes:
1. Build the library: `cd ../.. && npm run build`
2. Reinstall in demo: `npm install ../../dist`
3. Restart dev server

## Learn More

- [Library README](../README.md) - Project overview and API docs
- [Root README](../README.md) - Project overview
- [GitHub](https://github.com/AntonChesnokov/optimistate) - Source code

## Troubleshooting

**Port already in use?**
- Vite automatically increments ports (5173, 5174, 5175...)
- Or specify a port: `npm run dev -- --port 3000`

**Library not found?**
- Build the library first: `cd ../.. && npm run build`
- Check `node_modules/optimistate` exists in the demo

**TypeScript errors?**
- Ensure dependencies are installed: `npm install`
- Check TypeScript version: `npx tsc --version`
