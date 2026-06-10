import type {
  PlayNotificationCenterRecord,
  PlayNotificationRecord
} from "../application/ports";

const rouletteNotificationTypes = [
  "roulette-result-locked",
  "roulette-result-discarded"
] as const;

export function NotificationCenter({
  center
}: {
  center: PlayNotificationCenterRecord | null;
}) {
  const items = center?.items ?? [];
  const unreadCount = center?.unreadCount ?? 0;
  const extraCount = Math.max(unreadCount - items.length, 0);

  return (
    <details className="notification-center">
      <summary
        className="notification-trigger queue2-focusable"
        aria-label={`Notificacoes da dupla, ${unreadCount} nao lidas`}
      >
        <span>Notificacoes</span>
        <span className="notification-badge" aria-label={`${unreadCount} notificacoes nao lidas`}>
          {unreadCount}
        </span>
      </summary>
      <section className="notification-panel" aria-labelledby="central-title">
        <div className="section-heading">
          <h2 className="eyebrow" id="central-title">
            Central da Dupla
          </h2>
          <p className="support-copy">Pendencias e eventos operacionais da sessao.</p>
        </div>
        {items.length ? (
          <ol
            aria-label="Pendencias recentes da Central da Dupla"
            className="notification-list"
            tabIndex={0}
          >
            {items.map((item) => (
              <NotificationItem item={item} key={item.id} />
            ))}
          </ol>
        ) : (
          <p className="empty-state">Nada pendente na Central da Dupla.</p>
        )}
        {extraCount > 0 ? (
          <p className="notification-more">+{extraCount} pendencias fora do resumo</p>
        ) : null}
      </section>
    </details>
  );
}

function NotificationItem({ item }: { item: PlayNotificationRecord }) {
  return (
    <li
      className="notification-item"
      data-roulette-outcome={isRouletteNotificationType(item.notificationType) ? "true" : undefined}
      data-state={item.state}
      data-type={item.notificationType}
    >
      <strong>{item.title}</strong>
      {item.body ? <span className="muted">{item.body}</span> : null}
      <small>{formatDateTime(item.createdAt)}</small>
    </li>
  );
}

function isRouletteNotificationType(notificationType: string): boolean {
  return (rouletteNotificationTypes as readonly string[]).includes(notificationType);
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit"
  }).format(date);
}
