import { describe, it, expect } from 'vitest';
import { createOptimisticAction } from './create-optimistic-action';
import type { OptimisticOperation, WritableRef, WritableTarget } from './types';

function createMockRef<T>(initialValue: T): WritableRef<T> {
  let value = initialValue;
  return {
    get: () => value,
    set: (next) => {
      value = next;
    },
  };
}

function readTarget<T>(target: WritableTarget<T>): T {
  return typeof target === 'function' ? (target as () => T)() : target.get();
}

describe('createOptimisticAction', () => {
  it('should create an action with a run method', () => {
    const counterRef = createMockRef(0);
    const operation: OptimisticOperation<{ counter: WritableRef<number> }, { delta: number }> = {
      sources: { counter: counterRef },
      mutate: (state, payload) => ({ counter: state.counter + payload.delta }),
      operation: async () => 'success',
    };

    const action = createOptimisticAction(operation);

    expect(action).toHaveProperty('run');
    expect(typeof action.run).toBe('function');
  });

  it('should execute optimistic update when run is called', async () => {
    const counterRef = createMockRef(5);
    const operation: OptimisticOperation<{ counter: WritableRef<number> }, { delta: number }> = {
      sources: { counter: counterRef },
      mutate: (state, payload) => ({ counter: state.counter + payload.delta }),
      operation: async () => 'success',
    };

    const action = createOptimisticAction(operation);

    const promise = action.run({ delta: 3 });

    // Optimistic update should be applied
    expect(counterRef.get()).toBe(8);

    await promise;

    // Should remain after success
    expect(counterRef.get()).toBe(8);
  });

  it('should rollback on error', async () => {
    const counterRef = createMockRef(10);
    const operation: OptimisticOperation<{ counter: WritableRef<number> }, { delta: number }> = {
      sources: { counter: counterRef },
      mutate: (state, payload) => ({ counter: state.counter + payload.delta }),
      operation: async () => {
        throw new Error('Request failed');
      },
    };

    const action = createOptimisticAction(operation);

    await expect(action.run({ delta: 5 })).rejects.toThrow('Request failed');

    // Should rollback
    expect(counterRef.get()).toBe(10);
  });

  it('should expose status ref if provided', () => {
    const counterRef = createMockRef(0);
    const statusRef = createMockRef<'idle' | 'pending' | 'success' | 'error'>('idle');

    const operation: OptimisticOperation<{ counter: WritableRef<number> }, void> = {
      sources: { counter: counterRef },
      mutate: (state) => ({ counter: state.counter + 1 }),
      operation: async () => 'success',
      status: statusRef,
    };

    const action = createOptimisticAction(operation);

    expect(action.status).toBe(statusRef);
  });

  it('should expose error ref if provided', () => {
    const counterRef = createMockRef(0);
    const errorRef = createMockRef<unknown | null>(null);

    const operation: OptimisticOperation<{ counter: WritableRef<number> }, void> = {
      sources: { counter: counterRef },
      mutate: (state) => ({ counter: state.counter + 1 }),
      operation: async () => 'success',
      error: errorRef,
    };

    const action = createOptimisticAction(operation);

    expect(action.error).toBe(errorRef);
  });

  it('should create default status and error targets when not provided', async () => {
    const counterRef = createMockRef(0);

    const operation: OptimisticOperation<{ counter: WritableRef<number> }, void> = {
      sources: { counter: counterRef },
      mutate: (state) => ({ counter: state.counter + 1 }),
      operation: async () => 'success',
    };

    const action = createOptimisticAction(operation);

    expect(action.status).toBeDefined();
    expect(action.error).toBeDefined();

    await action.run(undefined);

    // Status should reflect success and error cleared
    expect(readTarget(action.status)).toBe('success');
    expect(readTarget(action.error)).toBe(null);
  });

  it('should return operation result', async () => {
    const counterRef = createMockRef(0);

    const operation: OptimisticOperation<
      { counter: WritableRef<number> },
      void,
      { id: string; value: number }
    > = {
      sources: { counter: counterRef },
      mutate: (state) => ({ counter: state.counter + 1 }),
      operation: async () => ({ id: 'abc123', value: 42 }),
    };

    const action = createOptimisticAction(operation);
    const result = await action.run(undefined);

    expect(result).toEqual({ id: 'abc123', value: 42 });
  });

  it('should handle multiple consecutive runs', async () => {
    const counterRef = createMockRef(0);
    let operationCount = 0;

    const operation: OptimisticOperation<{ counter: WritableRef<number> }, { delta: number }> = {
      sources: { counter: counterRef },
      mutate: (state, payload) => ({ counter: state.counter + payload.delta }),
      operation: async () => {
        operationCount++;
        await new Promise((resolve) => setTimeout(resolve, 5));
        return 'success';
      },
    };

    const action = createOptimisticAction(operation);

    await action.run({ delta: 1 });
    await action.run({ delta: 2 });
    await action.run({ delta: 3 });

    expect(counterRef.get()).toBe(6);
    expect(operationCount).toBe(3);
  });

  it('should respect concurrency settings', async () => {
    const counterRef = createMockRef(0);
    let operationCount = 0;

    const operation: OptimisticOperation<{ counter: WritableRef<number> }, void> = {
      sources: { counter: counterRef },
      mutate: (state) => ({ counter: state.counter + 1 }),
      operation: async () => {
        operationCount++;
        await new Promise((resolve) => setTimeout(resolve, 20));
        return 'success';
      },
      concurrency: 'ignore',
    };

    const action = createOptimisticAction(operation);

    const promise1 = action.run(undefined);
    const promise2 = action.run(undefined);

    await Promise.all([promise1, promise2]);

    // Only one operation should execute with 'ignore'
    expect(operationCount).toBe(1);
  });
});
