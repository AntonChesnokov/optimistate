<script lang="ts">
  import { writable, get } from 'svelte/store';
  import type { Writable } from 'svelte/store';
  import { createOptimisticAction, type WritableRef } from 'optimistate';

  const count = writable(0);
  const status = writable<'idle' | 'pending' | 'success' | 'error'>('idle');
  const error = writable<unknown | null>(null);

  // Helper to adapt a Svelte store to WritableRef
  const asRef = <T>(store: Writable<T>): WritableRef<T> => ({
    get: () => get(store),
    set: store.set,
  });

  const increment = createOptimisticAction({
    sources: { count: asRef(count) },
    mutate: (snapshot, payload: { delta: number }) => ({
      count: snapshot.count + payload.delta,
    }),
  operation: async () => {
    // Simulate network request
    await new Promise((resolve) => setTimeout(resolve, 800));
    // Simulate random failures (30% chance)
    if (Math.random() < 0.3) {
      throw new Error('Random server error');
    }
  },
    status: asRef(status),
    error: asRef(error),
  });

  const handleIncrement = (delta: number) => increment.run({ delta });

  const reset = () => {
    count.set(0);
    status.set('idle');
    error.set(null);
  };
</script>

<div class="app">
  <h1>Svelte + optimistate</h1>
  <div class="card">
    <div class="counter">
      <h2>Counter: {$count}</h2>
      <div class="status-badge" data-status={$status}>Status: {$status}</div>
    </div>

    <div class="buttons">
      <button on:click={() => handleIncrement(-1)} disabled={$status === 'pending'}>-1</button>
      <button on:click={() => handleIncrement(1)} disabled={$status === 'pending'}>+1</button>
      <button on:click={() => handleIncrement(5)} disabled={$status === 'pending'}>+5</button>
      <button on:click={reset} class="reset">Reset</button>
    </div>

    {#if $status === 'error'}
      <div class="error-message">
        ❌ {$error instanceof Error ? $error.message : String($error)}
      </div>
    {/if}

    {#if $status === 'success'}
      <div class="success-message">✅ Saved successfully!</div>
    {/if}

    <div class="instructions">
      <p><strong>How it works:</strong></p>
      <ul>
        <li>Click buttons to update counter</li>
        <li>UI updates immediately (optimistic)</li>
        <li>30% chance of simulated failure</li>
        <li>On error, counter rolls back automatically</li>
      </ul>
    </div>
  </div>
</div>

<style>
  .app {
    max-width: 600px;
    margin: 0 auto;
    padding: 2rem;
    text-align: center;
  }

  .card {
    padding: 2rem;
  }

  .counter {
    margin-bottom: 2rem;
  }

  .counter h2 {
    font-size: 3rem;
    margin: 0 0 1rem 0;
    color: #ff3e00;
  }

  .status-badge {
    display: inline-block;
    padding: 0.5rem 1rem;
    border-radius: 0.5rem;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 0.875rem;
  }

  .status-badge[data-status='idle'] {
    background-color: #e0e0e0;
    color: #666;
  }

  .status-badge[data-status='pending'] {
    background-color: #fff3cd;
    color: #856404;
    animation: pulse 1.5s ease-in-out infinite;
  }

  .status-badge[data-status='success'] {
    background-color: #d4edda;
    color: #155724;
  }

  .status-badge[data-status='error'] {
    background-color: #f8d7da;
    color: #721c24;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.6;
    }
  }

  .buttons {
    display: flex;
    gap: 1rem;
    justify-content: center;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
  }

  button {
    border-radius: 8px;
    border: 1px solid transparent;
    padding: 0.6em 1.2em;
    font-size: 1em;
    font-weight: 500;
    font-family: inherit;
    background-color: #ff3e00;
    color: white;
    cursor: pointer;
    transition: all 0.25s;
    min-width: 80px;
  }

  button:hover {
    background-color: #e63900;
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  button.reset {
    background-color: #666;
  }

  button.reset:hover {
    background-color: #555;
  }

  .error-message {
    background-color: #f8d7da;
    color: #721c24;
    padding: 1rem;
    border-radius: 0.5rem;
    margin-bottom: 1.5rem;
    border: 1px solid #f5c6cb;
  }

  .success-message {
    background-color: #d4edda;
    color: #155724;
    padding: 1rem;
    border-radius: 0.5rem;
    margin-bottom: 1.5rem;
    border: 1px solid #c3e6cb;
  }

  .instructions {
    margin-top: 2rem;
    padding: 1.5rem;
    background-color: #f8f9fa;
    border-radius: 0.5rem;
    text-align: left;
  }

  .instructions ul {
    margin: 0.5rem 0;
    padding-left: 1.5rem;
  }

  .instructions li {
    margin: 0.5rem 0;
  }
</style>
