import type { Clock } from '../clock.js';

export class TestClock implements Clock {
  constructor(public nowMs: number) {}

  now(): number {
    return this.nowMs;
  }

  advance(ms: number): void {
    this.nowMs += ms;
  }
}
