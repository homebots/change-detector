export type AnyFunction = (...args: any[]) => any;
export type ChangeCallback<T> = (newValue: T, oldValue: T | undefined) => void;
export type Expression<T> = () => T;

export interface Change<T> {
  value: T;
  lastValue: T | undefined;
  firstTime?: boolean;
}

export interface Changes {
  [property: string]: Change<unknown>;
}

export interface Watcher<T = unknown> {
  expression: AnyFunction;
  callback?: ChangeCallback<unknown>;
  lastValue?: T;
  useEquals?: boolean;
  metadata?: {
    property: string;
    isInput: boolean;
    firstTime: boolean;
  };
}

export interface ChangeDetector {
  // beforeCheck(fn: AnyFunction): void;
  // afterCheck(fn: AnyFunction): void;
  watch<T>(expression: Watcher | Expression<T>): void;
  watch<T>(expression: Expression<T>, callback: ChangeCallback<T>, useEquals?: boolean): void;
  // run<T>(callback: Function, applyThis?: object | null, applyArgs?: any[], source?: string): T;
  // fork(target?: any): ChangeDetector;

  markAsDirtyAndCheck(): void;
  scheduleCheck(): void;
  check(): void;
}

export interface TreeChangeDetector {
  id?: string;
  parent?: ChangeDetector;
  
  markTreeForCheck(): void;
  
  checkTree(): void;
  unregister(): void;
}