"use client";

import { useEffect, useMemo, useState } from "react";
import { RoulettePointer } from "@queue/ui";
import { motion, useReducedMotion } from "motion/react";

import type { RouletteRarity } from "../domain/roulette-policy";

export type RouletteReelSlotView = {
  id: string;
  title: string;
  coverUrl: string | null;
  rarity: RouletteRarity;
  selected?: boolean;
};

export type RouletteReelProps = {
  slots: RouletteReelSlotView[];
  result: RouletteReelSlotView | null;
  boosted?: boolean;
  status?: "ready" | "revealing" | "pending";
};

const REEL_SLOT_COUNT = 60;
const REVEAL_DURATION_MS = 5500;
const REVEAL_EASING = "cubic-bezier(.15,.85,.25,1)";
const reducedMotionStages = [
  "A fila esta escolhendo",
  "Resultado guardado",
  "Revelado"
] as const;

export function RouletteReel({
  slots,
  result,
  boosted = false,
  status = "ready"
}: RouletteReelProps) {
  const prefersReducedMotion = useReducedMotion();
  const [hasMounted, setHasMounted] = useState(false);
  const shouldReduceMotion = hasMounted && prefersReducedMotion;
  const visualSlots = useMemo(
    () => buildStableSlots(slots, result),
    [slots, result]
  );
  const selectedResult = result ?? visualSlots.find((slot) => slot.selected) ?? null;
  const liveCopy = selectedResult
    ? `Resultado guardado: ${selectedResult.title}`
    : "A roleta esta pronta para a fila.";
  const pointerTone = boosted || selectedResult?.rarity === "legendary" ? "accent" : "primary";

  useEffect(() => {
    setHasMounted(true);
  }, []);

  return (
    <section
      aria-label="Revelacao da roleta"
      aria-live="polite"
      className="roulette-reel-band"
      data-reveal-state={shouldReduceMotion ? "reduced-motion" : status}
      role="region"
      tabIndex={0}
    >
      <div className="roulette-reel-viewport">
        <div className="roulette-pointer-anchor">
          <RoulettePointer label="Ponteiro central da roleta" tone={pointerTone} />
        </div>
        {shouldReduceMotion ? (
          <ol className="roulette-reduced-motion-steps" aria-label="Etapas da revelacao reduzida">
            {reducedMotionStages.map((stage) => (
              <li key={stage}>{stage}</li>
            ))}
          </ol>
        ) : (
          <motion.ol
            animate={status === "revealing" || selectedResult ? { x: "-54%" } : { x: 0 }}
            aria-label="Capas decorativas da roleta"
            className="roulette-reel-track"
            initial={{ x: 0 }}
            style={{ transitionTimingFunction: REVEAL_EASING }}
            transition={{
              duration: REVEAL_DURATION_MS / 1000,
              ease: [0.15, 0.85, 0.25, 1]
            }}
          >
            {visualSlots.map((slot, index) => (
              <li
                aria-hidden="true"
                className="roulette-reel-slot"
                data-rarity={slot.rarity}
                data-selected={slot.selected ? "true" : "false"}
                key={`${slot.id}-${index}`}
              >
                <CoverSlot slot={slot} />
                {slot.rarity === "legendary" && slot.selected ? (
                  <>
                    <span className="roulette-legendary-particles" aria-hidden="true" />
                    <span className="roulette-static-legendary-seal" aria-hidden="true">
                      Legendary
                    </span>
                  </>
                ) : null}
              </li>
            ))}
          </motion.ol>
        )}
      </div>
      <p className="roulette-reel-live-status">{liveCopy}</p>
    </section>
  );
}

function CoverSlot({ slot }: { slot: RouletteReelSlotView }) {
  return slot.coverUrl ? (
    <img alt="" aria-hidden="true" draggable={false} src={slot.coverUrl} />
  ) : (
    <span aria-hidden="true">/2</span>
  );
}

function buildStableSlots(
  slots: RouletteReelSlotView[],
  result: RouletteReelSlotView | null
): RouletteReelSlotView[] {
  const fallbackSlot: RouletteReelSlotView = result ?? {
    coverUrl: null,
    id: "roulette-placeholder",
    rarity: "common",
    title: "QUEUE/2"
  };
  const sourceSlots = slots.length > 0 ? slots : [fallbackSlot];
  const stableSlots = Array.from({ length: 60 }, (_, index) => {
    const slot = sourceSlots[index % sourceSlots.length] ?? fallbackSlot;
    return {
      ...slot,
      selected: false
    };
  });

  if (result) {
    stableSlots[REEL_SLOT_COUNT - 8] = {
      ...result,
      selected: true
    };
  }

  return stableSlots;
}
