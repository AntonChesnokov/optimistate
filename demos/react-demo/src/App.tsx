import { useState } from 'react';
import { createOptimisticAction, type WritableRef } from 'optimistate';
import './App.css';

function useOptimisticCounter() {
  const [count, setCount] = useState(0);
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [error, setError] = useState<unknown | null>(null);

  // Create refs from React state
  const countRef: WritableRef<number> = {
    get: () => count,
    set: setCount,
  };

  const increment = createOptimisticAction({
    sources: { count: countRef },
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
    status: { get: () => status, set: setStatus },
    error: { get: () => error, set: setError },
  });

  return {
    count,
    status,
    error,
    increment: (delta: number) => increment.run({ delta }),
    reset: () => {
      setCount(0);
      setStatus('idle');
      setError(null);
    },
  };
}

function App() {
  const { count, status, error, increment, reset } = useOptimisticCounter();

  return (
    <div className="app">
      <h1>React + optimistate</h1>
      <div className="card">
        <div className="counter">
          <h2>Counter: {count}</h2>
          <div className="status-badge" data-status={status}>
            Status: {status}
          </div>
        </div>

        <div className="buttons">
          <button onClick={() => increment(-1)} disabled={status === 'pending'}>
            -1
          </button>
          <button onClick={() => increment(1)} disabled={status === 'pending'}>
            +1
          </button>
          <button onClick={() => increment(5)} disabled={status === 'pending'}>
            +5
          </button>
          <button onClick={reset} className="reset">
            Reset
          </button>
        </div>

        {status === 'error' && (
          <div className="error-message">
            ❌ {error instanceof Error ? error.message : String(error)}
          </div>
        )}

        {status === 'success' && <div className="success-message">✅ Saved successfully!</div>}

        <div className="instructions">
          <p>
            <strong>How it works:</strong>
          </p>
          <ul>
            <li>Click buttons to update counter</li>
            <li>UI updates immediately (optimistic)</li>
            <li>30% chance of simulated failure</li>
            <li>On error, counter rolls back automatically</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default App;
