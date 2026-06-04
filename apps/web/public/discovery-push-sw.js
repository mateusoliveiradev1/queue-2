self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  const title = typeof data.title === "string" ? data.title : "Match da dupla!";
  const body =
    typeof data.body === "string"
      ? data.body
      : "Abram a Discovery para celebrar o match da dupla.";
  const tag = typeof data.tag === "string" ? data.tag : "discovery-match";
  const url = typeof data.url === "string" ? data.url : "/app/descobrir";

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag,
      data: {
        url
      }
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/app/descobrir";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
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
