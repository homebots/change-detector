import * as clone from 'lodash.clone';
import * as isEqual from 'lodash.isequal';
import {
  AnyFunction,
  ChangeCallback,
  ChangeDetector,
  Changes,
  Expression,
  Watcher,
  TreeChangeDetector,
} from './interfaces';

let uid = 0;

// istanbul ignore next
const setTimeoutNative: Window['setTimeout'] = (...args) =>
  ((window as any).__zone_symbol__setTimeout || window.setTimeout)(...args);

export class ReactiveChangeDetector implements ChangeDetector {
  readonly id = `@${++uid}`;

  protected state: 'checking' | 'checked' | 'dirty' = 'dirty';
  protected timer = 0;

  private watchers: Watcher[] = [];
  private _afterCheck: AnyFunction[] = [];
  private _beforeCheck: AnyFunction[] = [];

  constructor(protected target: object | null = null) {}

  watch<T>(expression: Watcher | Expression<T>): void;
  watch<T>(expression: Watcher | Expression<T>, callback?: ChangeCallback<T>, useEquals = false): void {
    if (typeof expression !== 'function') {
      this.watchers.push(expression as Watcher);
      return;
    }

    this.watchers.push({
      expression: expression as Expression<T>,
      callback,
      useEquals,
    });
  }

  markAsDirtyAndCheck() {
    this.state = 'dirty';
    
    if (!this.timer) {
      this.scheduleCheck();
    }
  }

  scheduleCheck() {
    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.timer = setTimeoutNative(() => {
      this.check();
      this.timer = 0;
    }, 1);
  }

  check() {
    if (this.state === 'checked') return;

    const inputChanges: Changes = {};

    this._beforeCheck.forEach((fn) => fn(inputChanges));
    this.state = 'checking';

    const hasInputChanges = this.watchers.reduce(
      (value, watcher) => value || this.checkWatcher(inputChanges, watcher),
      false,
    );

    this._afterCheck.forEach(hasInputChanges ? (fn) => fn(inputChanges) : (fn) => fn(null));

    if (this.state !== 'checking') {
      this.scheduleCheck();
      return;
    }

    this.state = 'checked';
  }

  beforeCheck(fn: AnyFunction) {
    this._beforeCheck.push(fn);
  }

  afterCheck(fn: AnyFunction) {
    this._afterCheck.push(fn);
  }

  run<T>(callback: AnyFunction, applyThis?: object | null, applyArgs?: any[]): T {
    try {
      return callback.apply(applyThis, applyArgs);
    } catch (error) {
      console.log(error);
    }
  }

  protected checkWatcher(changes: Changes, watcher: Watcher) {
    const newValue = this.runWatcher(watcher.expression, this.target, []);
    const lastValue = watcher.lastValue;

    const useEquals = watcher.useEquals;
    const hasChanges = (!useEquals && newValue !== lastValue) || (useEquals && !isEqual(newValue, lastValue));

    if (!hasChanges) {
      return false;
    }

    if (watcher.metadata?.isInput) {
      changes[watcher.metadata.property] = {
        value: newValue,
        lastValue,
        firstTime: watcher.metadata.firstTime,
      };

      watcher.metadata.firstTime = false;
    }

    watcher.lastValue = useEquals ? clone(newValue) : newValue;

    if (watcher.callback) {
      this.runWatcherCallback(watcher.callback, null, [newValue, lastValue]);
    }

    return watcher.metadata?.isInput;
  }

  protected runWatcher(...args: any[]) {
    return this.run.apply(this, args);
  }

  protected runWatcherCallback(...args: any[]) {
    return this.run.apply(this, args);
  }
}

export class ReactiveTreeChangeDetector extends ReactiveChangeDetector implements TreeChangeDetector {
  protected children = new Map<object, ReactiveTreeChangeDetector>();

  constructor(protected target: object | null = null, public parent: ReactiveTreeChangeDetector = null) {
    super(target);

    if (this.parent) {
      this.parent.children.set(this.target, this);
    }
  }

  markTreeForCheck() {
    this.state = 'dirty';
    this.children.forEach((child) => child.markTreeForCheck());
  }

  checkTree() {
    this.check();
    this.children.forEach((cd) => cd.checkTree());
  }

  markAsDirtyAndCheck() {
    this.markTreeForCheck();

    if (!this.timer) {
      this.scheduleCheck();
    }
  }

  scheduleCheck() {
    if (this.timer) {
      clearTimeout(this.timer);
    }

    this.timer = setTimeoutNative(() => {
      this.checkTree();
      this.timer = 0;
    }, 1);
  }

  fork(target?: object | null) {
    return new ReactiveTreeChangeDetector(target || this.target, this);
  }

  unregister() {
    if (this.parent) {
      this.parent.children.delete(this.target);
    }
  }
}
