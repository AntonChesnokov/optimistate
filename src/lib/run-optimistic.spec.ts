import { describe, it, expect } from 'vitest';
import { runOptimistic } from './run-optimistic';
import type { OptimisticOperation, WritableRef, StatusRef, ErrorRef, RollbackHandler, WritableTarget } from './types';

function createMockRef<T>(initialValue: T): WritableRef<T> {
  let value = initialValue;
  return {
    get: () => value,
    set: (next) => {
      value = next;
    },
  };
}

function createMockStatusRef(): StatusRef {
  return createMockRef<'idle' | 'pending' | 'success' | 'error'>('idle');
}

function createMockErrorRef(): ErrorRef {
  return createMockRef<unknown | null>(null);
}

function readTarget<T>(target: WritableTarget<T>): T {
  return typeof target === 'function' ? (target as () => T)() : target.get();
}

describe('runOptimistic', () => {
  describe('basic optimistic updates', () => {
    it('should apply optimistic update immediately', async () => {
      const counterRef = createMockRef(0);
      const operation: OptimisticOperation<{ counter: WritableRef<number> }, { delta: number }> = {
        sources: { counter: counterRef },
        mutate: (state, payload) => ({ counter: state.counter + payload.delta }),
        operation: async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return 'success';
        },
      };

      const promise = runOptimistic(operation, { delta: 5 });

      // Optimistic update should be applied immediately
      expect(counterRef.get()).toBe(5);

      await promise;

      // Should still be 5 after success
      expect(counterRef.get()).toBe(5);
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

      const promise = runOptimistic(operation, { delta: 5 });

      // Optimistic update applied
      expect(counterRef.get()).toBe(15);

      await expect(promise).rejects.toThrow('Request failed');

      // Should rollback to original value
      expect(counterRef.get()).toBe(10);
    });

    it('should honor custom rollback handler instead of automatic rollback', async () => {
      const counterRef = createMockRef(10);
      const rollbackCalls: { previous: number; optimistic: number }[] = [];

      const rollback: RollbackHandler<{ counter: WritableRef<number> }, { delta: number }> = ({
        snapshot,
        optimistic,
      }) => {
        rollbackCalls.push({ previous: snapshot.counter, optimistic: optimistic.counter });
        counterRef.set(999); // custom handling
      };

      const operation: OptimisticOperation<{ counter: WritableRef<number> }, { delta: number }> = {
        sources: { counter: counterRef },
        mutate: (state, payload) => ({ counter: state.counter + payload.delta }),
        operation: async () => {
          throw new Error('Request failed');
        },
        rollback,
      };

      const promise = runOptimistic(operation, { delta: 5 });

      expect(counterRef.get()).toBe(15);
      await expect(promise).rejects.toThrow('Request failed');

      expect(counterRef.get()).toBe(999);
      expect(rollbackCalls).toEqual([{ previous: 10, optimistic: 15 }]);
    });

    it('should handle multiple sources', async () => {
      const nameRef = createMockRef('Alice');
      const ageRef = createMockRef(25);

      const operation: OptimisticOperation<
        { name: WritableRef<string>; age: WritableRef<number> },
        { newName: string; newAge: number }
      > = {
        sources: { name: nameRef, age: ageRef },
        mutate: (state, payload) => ({ name: payload.newName, age: payload.newAge }),
        operation: async () => 'success',
      };

      await runOptimistic(operation, { newName: 'Bob', newAge: 30 });

      expect(nameRef.get()).toBe('Bob');
      expect(ageRef.get()).toBe(30);
    });

    it('should rollback all sources on error', async () => {
      const nameRef = createMockRef('Alice');
      const ageRef = createMockRef(25);

      const operation: OptimisticOperation<
        { name: WritableRef<string>; age: WritableRef<number> },
        { newName: string; newAge: number }
      > = {
        sources: { name: nameRef, age: ageRef },
        mutate: (state, payload) => ({ name: payload.newName, age: payload.newAge }),
        operation: async () => {
          throw new Error('Failed');
        },
      };

      await expect(runOptimistic(operation, { newName: 'Bob', newAge: 30 })).rejects.toThrow();

      expect(nameRef.get()).toBe('Alice');
      expect(ageRef.get()).toBe(25);
    });
  });

  describe('status tracking', () => {
    it('should update status through lifecycle', async () => {
      const counterRef = createMockRef(0);
      const statusRef = createMockStatusRef();

      const operation: OptimisticOperation<{ counter: WritableRef<number> }, void> = {
        sources: { counter: counterRef },
        mutate: (state) => ({ counter: state.counter + 1 }),
        operation: async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return 'success';
        },
        status: statusRef,
      };

      expect(readTarget(statusRef)).toBe('idle');

      const promise = runOptimistic(operation, undefined);

      // Should be pending during request
      expect(readTarget(statusRef)).toBe('pending');

      await promise;

      // Should be success after completion
      expect(readTarget(statusRef)).toBe('success');
    });

    it('should set status to error on failure', async () => {
      const counterRef = createMockRef(0);
      const statusRef = createMockStatusRef();

      const operation: OptimisticOperation<{ counter: WritableRef<number> }, void> = {
        sources: { counter: counterRef },
        mutate: (state) => ({ counter: state.counter + 1 }),
        operation: async () => {
          throw new Error('Failed');
        },
        status: statusRef,
      };

      await expect(runOptimistic(operation, undefined)).rejects.toThrow();

      expect(readTarget(statusRef)).toBe('error');
    });
  });

  describe('error tracking', () => {
    it('should clear error on success', async () => {
      const counterRef = createMockRef(0);
      const errorRef = createMockErrorRef();

      // Set initial error
      errorRef.set(new Error('Previous error'));

      const operation: OptimisticOperation<{ counter: WritableRef<number> }, void> = {
        sources: { counter: counterRef },
        mutate: (state) => ({ counter: state.counter + 1 }),
        operation: async () => 'success',
        error: errorRef,
      };

      await runOptimistic(operation, undefined);

      // Error should be cleared
      expect(readTarget(errorRef)).toBe(null);
    });

    it('should set error on failure', async () => {
      const counterRef = createMockRef(0);
      const errorRef = createMockErrorRef();

      const testError = new Error('Test error');
      const operation: OptimisticOperation<{ counter: WritableRef<number> }, void> = {
        sources: { counter: counterRef },
        mutate: (state) => ({ counter: state.counter + 1 }),
        operation: async () => {
          throw testError;
        },
        error: errorRef,
      };

      await expect(runOptimistic(operation, undefined)).rejects.toThrow();

      expect(readTarget(errorRef)).toBe(testError);
    });
  });

  describe('concurrency control', () => {
    it('should allow concurrent operations by default', async () => {
      const counterRef = createMockRef(0);
      let requestCount = 0;

      const operation: OptimisticOperation<{ counter: WritableRef<number> }, { delta: number }> = {
        sources: { counter: counterRef },
        mutate: (state, payload) => ({ counter: state.counter + payload.delta }),
        operation: async () => {
          requestCount++;
          await new Promise((resolve) => setTimeout(resolve, 20));
          return 'success';
        },
      };

      const promise1 = runOptimistic(operation, { delta: 1 });
      const promise2 = runOptimistic(operation, { delta: 2 });

      await Promise.all([promise1, promise2]);

      // Both requests should have executed
      expect(requestCount).toBe(2);
    });

    it('should ignore concurrent operations when concurrency is "ignore"', async () => {
      const counterRef = createMockRef(0);
      let requestCount = 0;

      const operation: OptimisticOperation<{ counter: WritableRef<number> }, { delta: number }> = {
        sources: { counter: counterRef },
        mutate: (state, payload) => ({ counter: state.counter + payload.delta }),
        operation: async () => {
          requestCount++;
          await new Promise((resolve) => setTimeout(resolve, 20));
          return 'success';
        },
        concurrency: 'ignore',
      };

      const promise1 = runOptimistic(operation, { delta: 1 });
      const promise2 = runOptimistic(operation, { delta: 2 });

      const [result1, result2] = await Promise.all([promise1, promise2]);

      // Only one request should execute
      expect(requestCount).toBe(1);
      // Both promises should resolve to the same result
      expect(result1).toBe(result2);
    });

    it('should allow new operations after previous completes with "ignore"', async () => {
      const counterRef = createMockRef(0);
      let requestCount = 0;

      const operation: OptimisticOperation<{ counter: WritableRef<number> }, { delta: number }> = {
        sources: { counter: counterRef },
        mutate: (state, payload) => ({ counter: state.counter + payload.delta }),
        operation: async () => {
          requestCount++;
          await new Promise((resolve) => setTimeout(resolve, 10));
          return requestCount;
        },
        concurrency: 'ignore',
      };

      await runOptimistic(operation, { delta: 1 });
      await runOptimistic(operation, { delta: 2 });

      // Both requests should execute since they're sequential
      expect(requestCount).toBe(2);
    });
  });

  describe('operation context', () => {
    it('should provide payload, optimistic, and snapshot to operation', async () => {
      const counterRef = createMockRef(10);
      let receivedContext: unknown;

      const operation: OptimisticOperation<{ counter: WritableRef<number> }, { delta: number }> = {
        sources: { counter: counterRef },
        mutate: (state, payload) => ({ counter: state.counter + payload.delta }),
        operation: async (ctx) => {
          receivedContext = ctx;
          return 'success';
        },
      };

      await runOptimistic(operation, { delta: 5 });

      expect(receivedContext).toEqual({
        payload: { delta: 5 },
        snapshot: { counter: 10 },
        optimistic: { counter: 15 },
      });
    });
  });

  describe('edge cases', () => {
    it('should throw if no sources are provided', async () => {
      const operation: OptimisticOperation<Record<string, never>, void> = {
        sources: {},
        mutate: () => ({}),
        operation: async () => 'noop',
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await expect(runOptimistic(operation as any, undefined)).rejects.toThrow(
        'requires at least one source',
      );
    });

    it('should handle operations with no payload (void)', async () => {
      const counterRef = createMockRef(0);

      const operation: OptimisticOperation<{ counter: WritableRef<number> }, void> = {
        sources: { counter: counterRef },
        mutate: (state) => ({ counter: state.counter + 1 }),
        operation: async () => 'success',
      };

      await runOptimistic(operation, undefined);

      expect(counterRef.get()).toBe(1);
    });

    it('should handle synchronous request functions', async () => {
      const counterRef = createMockRef(0);

      const operation: OptimisticOperation<{ counter: WritableRef<number> }, void> = {
        sources: { counter: counterRef },
        mutate: (state) => ({ counter: state.counter + 1 }),
        operation: async () => 'immediate',
      };

      const result = await runOptimistic(operation, undefined);

      expect(result).toBe('immediate');
      expect(counterRef.get()).toBe(1);
    });

    it('should preserve error types when rethrowing', async () => {
      const counterRef = createMockRef(0);

      class CustomError extends Error {
        constructor(public code: number) {
          super('Custom error');
        }
      }

      const operation: OptimisticOperation<{ counter: WritableRef<number> }, void> = {
        sources: { counter: counterRef },
        mutate: (state) => ({ counter: state.counter + 1 }),
        operation: async () => {
          throw new CustomError(404);
        },
      };

      try {
        await runOptimistic(operation, undefined);
        expect.fail('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(CustomError);
        expect((err as CustomError).code).toBe(404);
      }
    });
  });
});
