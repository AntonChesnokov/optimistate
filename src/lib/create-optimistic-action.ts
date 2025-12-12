import { runOptimistic } from './run-optimistic';
import type {
  OptimisticOperation,
  SourceMap,
  OptimisticAction,
  StatusRef,
  ErrorRef,
  OptimisticActionStatus,
  WritableTarget,
} from './types';

function createRef<T>(initial: T): WritableTarget<T> {
  let value = initial;
  return {
    get: () => value,
    set: (next) => {
      value = next;
    },
  };
}

export function createOptimisticAction<
  Sources extends SourceMap,
  Payload,
  Result,
>(
  op: OptimisticOperation<Sources, Payload, Result>,
): OptimisticAction<Payload, Result> & { status: StatusRef; error: ErrorRef } {
  const status = op.status ?? createRef<OptimisticActionStatus>('idle');
  const error = op.error ?? createRef<unknown | null>(null);
  const opWithTargets = { ...op, status, error };

  return {
    run: (payload) => runOptimistic(opWithTargets, payload),
    status,
    error,
  };
}
