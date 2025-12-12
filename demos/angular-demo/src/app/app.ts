import { Component, signal } from '@angular/core';
import {
  createOptimisticAction,
  OptimisticActionStatus,
  type WritableRef,
  type WritableTarget,
} from 'optimistate';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly signalCounter = signal(0);
  readonly signalStatus = signal<OptimisticActionStatus>('idle');
  readonly signalError = signal<unknown | null>(null);
  readonly customCounter = signal(0);
  readonly customMessage = signal<string | null>(null);

  private readonly signalAction = createOptimisticAction({
    sources: { count: this.signalCounter },
    mutate: (snapshot, payload: { delta: number }) => ({
      count: snapshot.count + payload.delta,
    }),
    operation: async () => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      if (Math.random() < 0.3) {
        throw new Error('Random failure');
      }
      return undefined;
    },
    status: this.signalStatus,
    error: this.signalError,
    name: 'signal-counter',
  });

  readonly customAction = createOptimisticAction({
    sources: { count: this.customCounter },
    mutate: (snapshot, payload: { delta: number }) => ({
      count: snapshot.count + payload.delta,
    }),
    operation: async () => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      if (Math.random() < 0.3) {
        throw new Error('Custom rollback failure');
      }
      return undefined;
    },
    rollback: ({ snapshot }) => {
      this.customCounter.set(snapshot.count - 1);
      this.customMessage.set('Custom rollback applied (-1)');
    },
    name: 'custom-rollback-counter',
  });

  bumpSignal(delta: number) {
    return this.signalAction.run({ delta });
  }

  bumpCustom(delta: number) {
    return this.customAction.run({ delta });
  }

  resetSignal() {
    this.signalCounter.set(0);
    this.signalStatus.set('idle');
    this.signalError.set(null);
  }

  resetCustom() {
    this.customCounter.set(0);
    this.customMessage.set(null);
  }

  errorMessage(err: unknown): string {
    if (err instanceof Error) return err.message;
    return String(err);
  }

  readTarget<T>(target: WritableTarget<T> | undefined): T | undefined {
    if (!target) return undefined;
    return typeof target === 'function' ? (target as () => T)() : target.get();
  }
}
