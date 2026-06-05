import type { PlayTimelineMilestoneRecord } from "../application/ports";

export function MilestoneBadge({
  milestone
}: {
  milestone: PlayTimelineMilestoneRecord;
}) {
  return (
    <span className="milestone-badge" data-kind={milestone.kind}>
      {milestone.label}
    </span>
  );
}
