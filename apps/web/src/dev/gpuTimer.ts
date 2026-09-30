import type { Object3D } from 'three';
import { medianMs } from './frameTimes';

/** The swarm's two draws, by the names `SwarmPoints` and `SwarmTrails` give them. */
const TIMED_LAYERS = ['swarm', 'swarmTrails'] as const;
const REPORT_INTERVAL_SECONDS = 2;
const NANOSECONDS_PER_MS = 1e6;

interface TimerQueryExtension {
  TIME_ELAPSED_EXT: number;
  GPU_DISJOINT_EXT: number;
}

/**
 * GPU time of one draw. Results arrive frames later, so queries queue until available; a disjoint event (a GPU
 * power-state change, say) makes everything in flight meaningless, so those results are dropped.
 */
class GpuDrawTimer {
  readonly #samplesMs: number[] = [];
  readonly #pending: WebGLQuery[] = [];

  constructor(
    readonly gl: WebGL2RenderingContext,
    readonly extension: TimerQueryExtension,
  ) {}

  begin = (): void => {
    const query = this.gl.createQuery();
    this.gl.beginQuery(this.extension.TIME_ELAPSED_EXT, query);
    this.#pending.push(query);
  };

  end = (): void => {
    this.gl.endQuery(this.extension.TIME_ELAPSED_EXT);
  };

  collect(): void {
    const disjoint: unknown = this.gl.getParameter(this.extension.GPU_DISJOINT_EXT);
    for (let query = this.#pending[0]; query && this.#available(query); query = this.#pending[0]) {
      this.#pending.shift();
      const elapsed: unknown = this.gl.getQueryParameter(query, this.gl.QUERY_RESULT);
      if (disjoint !== true) this.#samplesMs.push(Number(elapsed) / NANOSECONDS_PER_MS);
      this.gl.deleteQuery(query);
    }
  }

  /** The median since the last call, or undefined when nothing arrived. */
  takeMedianMs(): number | undefined {
    if (this.#samplesMs.length === 0) return undefined;
    const median = medianMs(this.#samplesMs);
    this.#samplesMs.length = 0;
    return median;
  }

  #available(query: WebGLQuery): boolean {
    return this.gl.getQueryParameter(query, this.gl.QUERY_RESULT_AVAILABLE) === true;
  }
}

/** Times the swarm's points and trails each frame and logs their rolling medians every 2 s. */
class SwarmGpuTiming {
  readonly #timers = new Map<Object3D, GpuDrawTimer>();
  #lastReportSeconds = 0;

  constructor(
    readonly gl: WebGL2RenderingContext,
    readonly extension: TimerQueryExtension,
  ) {}

  update(scene: Object3D, nowSeconds: number): void {
    this.#attachNewLayers(scene);
    for (const timer of this.#timers.values()) timer.collect();
    if (nowSeconds - this.#lastReportSeconds < REPORT_INTERVAL_SECONDS) return;
    this.#lastReportSeconds = nowSeconds;
    this.#report();
  }

  /** The swarm mounts when the catalog arrives and trails remount when toggled, so layers are looked up each frame. */
  #attachNewLayers(scene: Object3D): void {
    for (const name of TIMED_LAYERS) {
      const layer = scene.getObjectByName(name);
      if (!layer || this.#timers.has(layer)) continue;
      const timer = new GpuDrawTimer(this.gl, this.extension);
      layer.onBeforeRender = timer.begin;
      layer.onAfterRender = timer.end;
      this.#timers.set(layer, timer);
    }
  }

  #report(): void {
    const parts = [...this.#timers].flatMap(([layer, timer]) => {
      const median = timer.takeMedianMs();
      return median === undefined ? [] : [`${layer.name} ${median.toFixed(3)} ms`];
    });
    if (parts.length > 0) console.info(`[gpu] ${parts.join(' · ')} (median over 2 s)`);
  }
}

/** Chrome on macOS may not expose the timer; the 4× stress run is then the evidence (plan, Task 7). */
export function createSwarmGpuTiming(context: WebGLRenderingContext | WebGL2RenderingContext) {
  const extension: unknown =
    context instanceof WebGL2RenderingContext
      ? context.getExtension('EXT_disjoint_timer_query_webgl2')
      : null;
  if (!(context instanceof WebGL2RenderingContext) || !isTimerQueryExtension(extension)) {
    console.info('[gpu] EXT_disjoint_timer_query_webgl2 is unavailable: no GPU timings');
    return undefined;
  }
  return new SwarmGpuTiming(context, extension);
}

function isTimerQueryExtension(value: unknown): value is TimerQueryExtension {
  return (
    typeof value === 'object' &&
    value !== null &&
    'TIME_ELAPSED_EXT' in value &&
    'GPU_DISJOINT_EXT' in value
  );
}
