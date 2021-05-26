import { ReactiveChangeDetector } from './index';

describe('ReactiveChangeDetector', () => {
  it('should watch an expression', () => {
    const cd = new ReactiveChangeDetector();
    cd.watch(() => 1 + 2);
  });
});
