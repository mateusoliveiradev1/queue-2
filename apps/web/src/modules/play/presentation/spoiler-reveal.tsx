import type { PlayMomentoRecord } from "../application/ports";

type PlayTimelineAction = (formData: FormData) => void | Promise<void>;

export function SpoilerReveal({
  action,
  gameSlug,
  momento
}: {
  action: PlayTimelineAction;
  gameSlug: string;
  momento: PlayMomentoRecord;
}) {
  if (!momento.isSpoiler || momento.revealedForViewer) {
    return <p>{momento.body}</p>;
  }

  return (
    <div className="spoiler-block">
      <p>Momento com spoiler oculto para voce.</p>
      <form action={action}>
        <input name="momentoId" type="hidden" value={momento.id} />
        <input name="gameSlug" type="hidden" value={gameSlug} />
        <button className="queue2-button" data-tone="quiet" type="submit">
          Revelar spoiler
        </button>
      </form>
    </div>
  );
}
