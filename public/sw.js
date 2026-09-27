// Web Push service worker for the owner-only "site was accessed" alert.
// Registered by components/push-notifications-manager.tsx, only from an
// authenticated /admin request — this file itself does nothing on its own
// and carries no visitor data; it only shows what the server sends.

self.addEventListener("push", function (event) {
  let data = { title: "PreçoCaindo", body: "" };
  try {
    if (event.data) data = event.data.json();
  } catch {
    // keep the default
  }
  const options = {
    body: data.body || "",
    icon: "/icon.png",
    badge: "/logo-icon.png",
    data: { url: data.url || "/" },
  };
  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of clientsList) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) await client.navigate(url);
          return;
        }
      }
      await self.clients.openWindow(url);
    })(),
  );
});
