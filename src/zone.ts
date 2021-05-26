/// <reference types="zone.js/dist/zone.js" />

import { ReactiveTreeChangeDetector } from './reactive';
import { ChangeDetector } from './interfaces';

interface ZoneProperties {
  changeDetector: ChangeDetector;
}

export class ZoneChangeDetector extends ReactiveTreeChangeDetector implements ZoneSpec, ChangeDetector {
  get name() {
    return this.id;
  }

  readonly properties: ZoneProperties = { changeDetector: this };

  parent: ZoneChangeDetector;
  protected _zone: Zone;

  private get zone() {
    if (!this._zone) {
      this._zone = (this.parent?.zone || Zone.root).fork(this);
    }

    return this._zone;
  }

  run<T>(callback: Function, applyThis?: object | null, applyArgs?: any[]): T {
    return this.zone.runGuarded(callback, applyThis, applyArgs, this.id);
  }

  fork(component: any) {
    return new ZoneChangeDetector(component, this);
  }

  protected runWatcherCallback(callback: Function, applyThis?: object | null, applyArgs?: any[]) {
    return this.zone.runGuarded(callback, applyThis, applyArgs, this.id);
  }

  protected runWatcher(...args: any[]) {
    return super.run.apply(this, args);
  }

  onInvoke(
    delegate: ZoneDelegate,
    _: Zone,
    target: Zone,
    callback: VoidFunction,
    applyThis: any,
    applyArgs: any[],
    _source: string,
  ) {
    const output = delegate.invoke(target, callback, applyThis, applyArgs);
    this.scheduleZoneCheck(target);

    return output;
  }

  onInvokeTask(delegate: ZoneDelegate, _: Zone, target: Zone, task: Task, applyThis: object | null, applyArgs: any[]) {
    const output = delegate.invokeTask(target, task, applyThis, applyArgs);
    this.scheduleZoneCheck(target);

    return output;
  }

  onScheduleTask(delegate: ZoneDelegate, _: Zone, target: Zone, task: Task) {
    const scheduledTask = delegate.scheduleTask(target, task);
    this.scheduleZoneCheck(target);

    return scheduledTask;
  }

  private scheduleZoneCheck(zone: Zone) {
    const changeDetector: ChangeDetector = zone.get('changeDetector');

    changeDetector.markAsDirtyAndCheck();
  }
}
