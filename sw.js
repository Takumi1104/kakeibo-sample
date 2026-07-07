// めぐる家計簿 service worker — push リマインダー用
const APP_URL = "/";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let title = "めぐる家計簿";
  let body = "今日のきろく、つけた？ タップだけでOK📝";
  if (event.data) {
    try {
      const d = event.data.json();
      if (d.title) title = d.title;
      if (d.body) body = d.body;
    } catch (e) {
      const t = event.data.text();
      if (t) body = t;
    }
  }
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "icon-180.png",
      badge: "icon-180.png",
      tag: "kakeibo-reminder",
      renotify: true,
      data: { url: APP_URL },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of all) {
        if ("focus" in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(APP_URL);
    })()
  );
});
