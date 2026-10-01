export interface SwarmControlsProps {
  showTrails: boolean;
  onShowTrailsChange: (showTrails: boolean) => void;
}

/** React state is fine here: it changes only when the viewer clicks. Off unmounts the trails entirely. */
export function SwarmControls({ showTrails, onShowTrailsChange }: SwarmControlsProps) {
  return (
    <label className="panel swarm-controls">
      <input
        type="checkbox"
        checked={showTrails}
        onChange={(event) => onShowTrailsChange(event.currentTarget.checked)}
      />
      Trails
    </label>
  );
}
