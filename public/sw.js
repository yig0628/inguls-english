self.addEventListener("push", event => {
  if (!event.data) return;
  const { title, body, tag } = event.data.json();
  event.waitUntil(self.registration.showNotification(title, {
    body, tag, icon: "/icon-192.png",
  }));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const url = new URL("/#worksheet", self.location.origin);
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const app = windows.find(client => new URL(client.url).origin === url.origin);
    if (app) {
      const opened = await app.navigate(url.href);
      if (opened) return opened.focus();
    }
    return self.clients.openWindow(url.href);
  })());
});
