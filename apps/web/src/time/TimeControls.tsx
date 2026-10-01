import { TIME_RANGE_JD_TDB } from './timeController';
import {
  formatRate,
  formatSimulationDate,
  rateFromSliderPosition,
  sliderPositionFromRate,
} from './timeDisplay';
import { timeStore } from './timeStore';
import { useTimeReadout } from './useTimeReadout';

const RATE_SLIDER_STEPS = 1_000;

export function TimeControls() {
  const readout = useTimeReadout();
  return (
    <div className="panel timeline" role="group" aria-label="Simulation time">
      <div className="transport">
        <button
          type="button"
          className="play"
          onClick={() => timeStore.setPlaying(!readout.playing)}
        >
          {readout.playing ? 'Pause' : 'Play'}
        </button>
        <button type="button" onClick={() => timeStore.jumpToNow()}>
          Now
        </button>
        <div className="clock">
          <output className="mono" aria-label="Simulation date">
            {formatSimulationDate(readout.jdTdb)}
          </output>
          <span className="clock-note">simulated time</span>
        </div>
      </div>
      <DateScrubber jdTdb={readout.jdTdb} />
      <RateSlider rateDaysPerSecond={readout.rateDaysPerSecond} />
    </div>
  );
}

function DateScrubber({ jdTdb }: { jdTdb: number }) {
  return (
    <input
      type="range"
      aria-label="Scrub date"
      min={TIME_RANGE_JD_TDB.startJdTdb}
      max={TIME_RANGE_JD_TDB.endJdTdb}
      step={1}
      value={jdTdb}
      onChange={(event) => timeStore.scrubTo(event.currentTarget.valueAsNumber)}
    />
  );
}

function RateSlider({ rateDaysPerSecond }: { rateDaysPerSecond: number }) {
  return (
    <label className="rate-slider">
      <input
        type="range"
        aria-label="Speed"
        min={0}
        max={RATE_SLIDER_STEPS}
        value={Math.round(sliderPositionFromRate(rateDaysPerSecond) * RATE_SLIDER_STEPS)}
        onChange={(event) =>
          timeStore.setRate(
            rateFromSliderPosition(event.currentTarget.valueAsNumber / RATE_SLIDER_STEPS),
          )
        }
      />
      <span>{formatRate(rateDaysPerSecond)}</span>
    </label>
  );
}
