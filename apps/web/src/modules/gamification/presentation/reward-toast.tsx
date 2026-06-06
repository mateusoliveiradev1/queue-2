"use client";

import { useEffect, useRef } from "react";
import { queueToast } from "@queue/ui";

import type { RewardToastViewModel } from "./view-models";

export function RewardToast({
  reward
}: {
  reward: RewardToastViewModel | null;
}) {
  const shownKey = useRef("");

  useEffect(() => {
    if (!reward || shownKey.current === reward.key) {
      return;
    }

    shownKey.current = reward.key;
    queueToast(reward.title, {
      description: reward.body,
      variant: reward.variant
    });
  }, [reward]);

  if (!reward) {
    return null;
  }

  return (
    <p className="reward-inline-state" data-variant={reward.variant} role="status">
      {reward.inlineLabel}
    </p>
  );
}
