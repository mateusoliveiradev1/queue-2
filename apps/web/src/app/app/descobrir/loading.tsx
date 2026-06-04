import { QueueMark } from "@queue/ui";

export default function DiscoveryLoading() {
  return (
    <div className="route-loading discovery-loading" role="status" aria-live="polite">
      <QueueMark size={56} />
      <span>Carregando cartas da dupla...</span>
    </div>
  );
}
