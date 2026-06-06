import type {
  PlayNotificationCenterRecord,
  PlayNotificationRecord
} from "../application/ports";

export function NotificationCenter({
  center
}: {
  center: PlayNotificationCenterRecord | null;
}) {
  const items = center?.items ?? [];
  const unreadCount = center?.unreadCount ?? 0;
  const extraCount = Math.max(unreadCount - items.length, 0);

  return (
    <section className="notification-center" aria-labelledby="central-title">
      <div className="section-heading">
        <h2 className="eyebrow" id="central-title">
          Central da Dupla
        </h2>
        <p className="support-copy">Pendencias e eventos operacionais da sessao.</p>
      </div>
      <span className="notification-badge" aria-label={`${unreadCount} notificacoes nao lidas`}>
        {unreadCount}
      </span>
      {items.length ? (
        <ol className="notification-list">
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
  );
}

function NotificationItem({ item }: { item: PlayNotificationRecord }) {
  return (
    <li className="notification-item" data-state={item.state} data-type={item.notificationType}>
      <strong>{item.title}</strong>
      {item.body ? <span className="muted">{item.body}</span> : null}
      <small>{formatDateTime(item.createdAt)}</small>
    </li>
  );
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit"
  }).format(date);
}
