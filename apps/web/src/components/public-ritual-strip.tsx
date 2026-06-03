import { RoulettePointer } from "@queue/ui";

type PublicRitualStripProps = {
  steps: [string, string, string];
};

export function PublicRitualStrip({ steps }: PublicRitualStripProps) {
  return (
    <ol className="public-ritual-strip" aria-label="Ritual publico QUEUE dois">
      {steps.map((step, index) => (
        <li key={step}>
          <span>{String(index + 1).padStart(2, "0")}</span>
          <strong>{step}</strong>
          {index < steps.length - 1 ? <RoulettePointer aria-hidden="true" label="" /> : null}
        </li>
      ))}
    </ol>
  );
}
