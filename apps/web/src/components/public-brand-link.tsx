import { QueueMark, QueueWordmark } from "@queue/ui";

type PublicBrandLinkProps = {
  compact?: boolean;
  display?: "mark" | "wordmark";
  size?: number;
  variant?: "single" | "stacked";
};

export function PublicBrandLink({
  compact = false,
  display = "wordmark",
  size = 52,
  variant = "single"
}: PublicBrandLinkProps) {
  return (
    <a className="public-brand-link queue2-focusable" href="/" aria-label="Ir para a home QUEUE dois">
      {display === "mark" ? (
        <QueueMark size={size} />
      ) : (
        <QueueWordmark compact={compact} variant={variant} />
      )}
    </a>
  );
}
