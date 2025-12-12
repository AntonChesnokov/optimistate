export interface WritableRef<T> {
  /** Read current value */
  get(): T;
  /** Write next value */
  set(next: T): void;
}

export interface CallableWritable<T> {
  /** Read current value (callable form) */
  (): T;
  /** Write next value */
  set(next: T): void;
}

export type WritableTarget<T> = WritableRef<T> | CallableWritable<T>;

export type SourceMap = Record<string, WritableTarget<unknown>>;

export type Snapshot<Sources extends SourceMap> = {
  [K in keyof Sources]: Sources[K] extends WritableTarget<infer V> ? V : unknown;
};

export type OptimisticActionStatus = 'idle' | 'pending' | 'success' | 'error';

export type StatusRef = WritableTarget<OptimisticActionStatus>;
export type ErrorRef<T = unknown | null> = WritableTarget<T>;

export type RollbackHandler<Sources extends SourceMap, Payload> = (ctx: {
  payload: Payload;
  optimistic: Snapshot<Sources>; // state after optimistic mutate
  snapshot: Snapshot<Sources>; // state before optimistic mutate
  error: unknown;
}) => void;

export interface BaseOptimisticOperation<
  Sources extends SourceMap,
  Payload = void,
  Result = unknown,
> {
  sources: Sources;
  mutate: (snapshot: Snapshot<Sources>, payload: Payload) => Snapshot<Sources>;
  operation: (ctx: {
    payload: Payload;
    optimistic: Snapshot<Sources>;
    snapshot: Snapshot<Sources>;
  }) => Promise<Result>;
  concurrency?: 'allow' | 'ignore';
  status?: StatusRef | undefined;
  error?: ErrorRef | undefined;
  rollback?: RollbackHandler<Sources, Payload>;
  name?: string;
}

export interface AdvancedOptimisticOperation<
  Sources extends SourceMap,
  Payload = void,
  Result = unknown,
> extends BaseOptimisticOperation<Sources, Payload, Result> {
  status: StatusRef;
  error?: ErrorRef | undefined;
}

export type OptimisticOperation<
  Sources extends SourceMap,
  Payload = void,
  Result = unknown,
> = BaseOptimisticOperation<Sources, Payload, Result> | AdvancedOptimisticOperation<Sources, Payload, Result>;

export interface OptimisticAction<Payload, Result = unknown> {
  run(payload: Payload): Promise<Result>;
  readonly status?: StatusRef | undefined;
  readonly error?: ErrorRef | undefined;
}

export type AnyOptimisticOperation = OptimisticOperation<
  SourceMap,
  unknown,
  unknown
>;
