import { QueueLoading } from "@queue/ui";

export default function Loading() {
  return (
    <main className="route-loading">
      <QueueLoading label="Carregando a fila..." />
    </main>
  );
}
