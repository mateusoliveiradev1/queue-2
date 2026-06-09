"use client";

import { useEffect, useRef, useState, type MutableRefObject } from "react";

type RouletteAudioPreferenceAction = (formData: FormData) => Promise<unknown>;

export type RouletteAudioControlProps = {
  defaultEnabled: boolean;
  updateRouletteAudioPreferenceAction?: RouletteAudioPreferenceAction;
};

type AudioWindow = Window & typeof globalThis & {
  webkitAudioContext?: typeof AudioContext;
};

export function RouletteAudioControl({
  defaultEnabled,
  updateRouletteAudioPreferenceAction
}: RouletteAudioControlProps) {
  const [enabled, setEnabled] = useState(defaultEnabled);
  const [status, setStatus] = useState(
    defaultEnabled ? "Som da roleta ligado" : "Som da roleta desligado"
  );
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    setEnabled(defaultEnabled);
    setStatus(defaultEnabled ? "Som da roleta ligado" : "Som da roleta desligado");
  }, [defaultEnabled]);

  async function handleToggle() {
    const nextEnabled = !enabled;
    setEnabled(nextEnabled);
    setStatus(nextEnabled ? "Som da roleta ligado" : "Som da roleta desligado");

    if (nextEnabled) {
      await playOptInPreview(audioContextRef);
    }

    const formData = new FormData();
    formData.set("audioEnabled", String(nextEnabled));
    await updateRouletteAudioPreferenceAction?.(formData);
  }

  return (
    <div
      className="roulette-audio-control"
      data-audio-contract="dry tick heavier cadence near the pointer restrained fanfare"
      data-audio-policy="no autoplay audio preference"
    >
      <button
        aria-pressed={enabled}
        className="queue2-button roulette-audio-toggle"
        data-tone="quiet"
        onClick={handleToggle}
        type="button"
      >
        {enabled ? "Som da roleta ligado" : "Som da roleta desligado"}
      </button>
      <span aria-live="polite" className="roulette-audio-status">
        {status}
      </span>
    </div>
  );
}

async function playOptInPreview(audioContextRef: MutableRefObject<AudioContext | null>) {
  const context = getAudioContext(audioContextRef);

  if (!context) {
    return;
  }

  if (context.state === "suspended") {
    await context.resume();
  }

  const now = context.currentTime;
  playTone(context, now, 420, 0.035, 0.04);
  playTone(context, now + 0.09, 520, 0.04, 0.045);
  playTone(context, now + 0.16, 700, 0.055, 0.05);
  playTone(context, now + 0.28, 260, 0.08, 0.05);
}

function getAudioContext(
  audioContextRef: MutableRefObject<AudioContext | null>
): AudioContext | null {
  if (audioContextRef.current) {
    return audioContextRef.current;
  }

  if (typeof window === "undefined") {
    return null;
  }

  const AudioContextConstructor =
    window.AudioContext ?? (window as AudioWindow).webkitAudioContext;

  if (!AudioContextConstructor) {
    return null;
  }

  audioContextRef.current = new AudioContextConstructor();
  return audioContextRef.current;
}

function playTone(
  context: AudioContext,
  startAt: number,
  frequency: number,
  duration: number,
  gainValue: number
) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(frequency, startAt);
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(gainValue, startAt + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.02);
}
