import type { Phase2LibraryStatus } from "../domain/library-policy";

const phase2Statuses: Array<{ status: Phase2LibraryStatus; label: string }> = [
  { status: "wishlist", label: "Wishlist" },
  { status: "jogando", label: "Jogando" },
  { status: "pausado", label: "Pausado" }
];

export function LibraryStatusControls({
  action,
  catalogGameId,
  currentStatus,
  returnTo
}: {
  action: (formData: FormData) => Promise<void>;
  catalogGameId: string;
  currentStatus: string;
  returnTo?: string;
}) {
  return (
    <div className="status-controls" aria-label="Mudar status na biblioteca">
      {phase2Statuses.map((item) => (
        <form action={action} key={item.status}>
          <input name="catalogGameId" type="hidden" value={catalogGameId} />
          <input name="status" type="hidden" value={item.status} />
          {returnTo ? <input name="returnTo" type="hidden" value={returnTo} /> : null}
          <button
            aria-pressed={currentStatus === item.status}
            className="queue2-button"
            data-tone={currentStatus === item.status ? "primary" : "quiet"}
            type="submit"
          >
            {item.label}
          </button>
        </form>
      ))}
      <button aria-disabled="true" className="queue2-button" data-tone="quiet" disabled type="button">
        Zerado na Fase 4
      </button>
      <button aria-disabled="true" className="queue2-button" data-tone="quiet" disabled type="button">
        Dropado na Fase 4
      </button>
    </div>
  );
}
