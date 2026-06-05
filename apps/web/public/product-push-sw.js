self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = typeof data.title === "string" ? data.title : "Sessao da dupla";
  const body =
    typeof data.body === "string"
      ? data.body
      : "Abram o QUEUE/2 para ver a Central da Dupla.";
  const tag = typeof data.tag === "string" ? data.tag : "play-session";
  const url = typeof data.url === "string" ? data.url : "/app";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      data: {
        url
      },
      tag
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/app";

  event.waitUntil(
    self.clients.matchAll({ includeUncontrolled: true, type: "window" }).then((clients) => {
      const matchingClient = clients.find((client) =>
        client.url.endsWith(targetUrl)
      );

      if (matchingClient) {
        return matchingClient.focus();
      }

      return self.clients.openWindow(targetUrl);
    })
  );
});
