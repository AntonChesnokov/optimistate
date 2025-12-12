import type {
  AnyOptimisticOperation,
  OptimisticOperation,
  OptimisticActionStatus,
  Snapshot,
  SourceMap,
  WritableTarget,
  StatusRef,
  ErrorRef,
} from './types';

const readTarget = <T>(ref: WritableTarget<T>): T =>
  typeof ref === 'function' ? (ref as () => T)() : ref.get();

const writeTarget = <T>(ref: WritableTarget<T>, next: T): void => {
  if (typeof ref === 'function') {
    (ref as { set(next: T): void }).set(next);
    return;
  }
  ref.set(next);
};

const setTarget = <T extends WritableTarget<unknown> | undefined, V>(
  ref: T,
  next: V,
): void => {
  if (!ref) return;
  writeTarget(ref as WritableTarget<V>, next);
};

const setStatus = (statusRef: StatusRef | undefined, next: OptimisticActionStatus) =>
  setTarget(statusRef, next);

const setError = (errorRef: ErrorRef | undefined, next: unknown | null) =>
  setTarget(errorRef, next);

const inFlightCount = new WeakMap<AnyOptimisticOperation, number>();
const inFlightPromise = new WeakMap<AnyOptimisticOperation, Promise<unknown>>();

export function runOptimistic<
  Sources extends SourceMap,
  Payload,
  Result,
>(
  op: OptimisticOperation<Sources, Payload, Result>,
  payload: Payload,
): Promise<Result> {
  const { sources, mutate, rollback, concurrency = 'allow', operation } = op;
  const status = 'status' in op ? op.status : undefined;
  const error = 'error' in op ? op.error : undefined;

  const opKey = op as unknown as AnyOptimisticOperation;

  const active = inFlightCount.get(opKey) ?? 0;
  if (concurrency === 'ignore' && active > 0) {
    const existing = inFlightPromise.get(opKey);
    if (existing) {
      return existing as Promise<Result>;
    }
  }

  const runPromise = (async () => {
    inFlightCount.set(opKey, active + 1);

    const keys = Object.keys(sources) as (keyof Sources)[];
    if (keys.length === 0) {
      throw new Error('runOptimistic requires at least one source to update.');
    }
    const snapshot = {} as Snapshot<Sources>;
    for (const key of keys) {
      const ref = sources[key];
      snapshot[key] = readTarget(ref) as Snapshot<Sources>[typeof key];
    }

    const optimistic = mutate(snapshot, payload);

    for (const key of keys) {
      writeTarget(sources[key], optimistic[key]);
    }

    setStatus(status, 'pending');
    setError(error, null);

    try {
      const result = await operation({ payload, optimistic, snapshot });
      setStatus(status, 'success');
      return result;
    } catch (err) {
      if (rollback) {
        rollback({ payload, optimistic, snapshot, error: err });
      } else {
        for (const key of keys) {
          writeTarget(sources[key], snapshot[key]);
        }
      }
      setStatus(status, 'error');
      setError(error, err);
      throw err;
    } finally {
      const nextActive = (inFlightCount.get(opKey) ?? 1) - 1;
      if (nextActive > 0) {
        inFlightCount.set(opKey, nextActive);
      } else {
        inFlightCount.delete(opKey);
        inFlightPromise.delete(opKey);
      }
    }
  })();

  inFlightPromise.set(opKey, runPromise as Promise<unknown>);
  return runPromise;
}
